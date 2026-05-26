// POST /api/admin/brands/[id]/instagram/sync
//
// Key API facts learned from v22.0 errors:
// - "impressions" is removed in v22.0+ for ALL media types (image, carousel, video, reel)
// - "video_views" is also unsupported for video media returned from /media endpoint
// - "video" media_type from /media endpoint = Reels (not regular videos) → use plays,shares
// - Profile insights: only "reach" is safe; "follower_count" returns delta not absolute
// - We track absolute follower count by saving the live profile count on each sync
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";

function adminGuard(req, res) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true")) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return false;
  }
  return true;
}

async function igGet(url) {
  const r = await fetch(url);
  const d = await r.json();
  if (d.error) throw new Error(`IG ${d.error.code}: ${d.error.message}`);
  return d;
}

function extractValue(data, name) {
  const item = data.find(d => d.name === name);
  if (!item) return 0;
  const fromArr = item.values?.[0]?.value;
  if (fromArr !== undefined && fromArr !== null) return Number(fromArr) || 0;
  if (typeof item.value === "number") return item.value;
  return 0;
}

// "video" from /media endpoint = Reels. Both video and reel → plays,shares.
// image and carousel_album have no valid extra metrics in v22.0+ (impressions removed).
function extraMetrics(mediaType) {
  const t = (mediaType || "image").toLowerCase();
  if (t === "reel" || t === "video") return "plays,shares";
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!adminGuard(req, res)) return;

  await dbConnect();
  const { id } = req.query;

  const brand = await Brand.findById(id).select("+instagram.token").lean();
  if (!brand)                      return res.status(404).json({ success: false, message: "Brand not found" });
  if (!brand.instagram?.connected) return res.status(400).json({ success: false, message: "Instagram not connected" });

  const token  = brand.instagram.token;
  const userId = brand.instagram.userId;
  if (!token || !userId) return res.status(400).json({ success: false, message: "Missing token or userId" });

  const extraErrors = [];

  try {
    // 1. Live profile: username + current absolute follower count
    const profile = await igGet(
      `https://graph.facebook.com/v19.0/${userId}` +
      `?fields=username,followers_count&access_token=${token}`
    );
    const currentFollowers = profile.followers_count || brand.instagram.followersCount || 0;

    // 2. Fetch up to 50 recent media items
    const mediaRes = await igGet(
      `https://graph.facebook.com/v19.0/${userId}/media` +
      `?fields=id,caption,media_type,timestamp,permalink,thumbnail_url,media_url,like_count,comments_count` +
      `&limit=50&access_token=${token}`
    );
    const mediaList = mediaRes.data || [];

    // 3. Per-post insights — two independent stages so reach is never lost
    const posts = await Promise.all(mediaList.map(async media => {
      const mediaType = (media.media_type || "IMAGE").toLowerCase();
      const post = {
        igId:         media.id,
        mediaType,
        caption:      media.caption        || "",
        permalink:    media.permalink      || "",
        thumbnailUrl: media.thumbnail_url  || media.media_url || "",
        timestamp:    media.timestamp ? new Date(media.timestamp) : null,
        likes:        media.like_count     || 0,
        comments:     media.comments_count || 0,
        reach: 0, impressions: 0, saved: 0, shares: 0, videoViews: 0,
      };

      // Stage 1 — reach + saved. Valid for every media type in every API version.
      try {
        const r = await igGet(
          `https://graph.facebook.com/v19.0/${media.id}/insights` +
          `?metric=reach,saved&access_token=${token}`
        );
        const d = r.data || [];
        post.reach = extractValue(d, "reach");
        post.saved = extractValue(d, "saved");
      } catch (e) {
        console.error(`[instagram/sync] reach+saved failed ${media.id}(${mediaType}):`, e.message);
      }

      // Stage 2 — plays + shares for video/reel. Fails silently (reach already saved).
      const extras = extraMetrics(mediaType);
      if (extras) {
        try {
          const r = await igGet(
            `https://graph.facebook.com/v19.0/${media.id}/insights` +
            `?metric=${extras}&access_token=${token}`
          );
          const d = r.data || [];
          post.videoViews = extractValue(d, "plays");
          post.shares     = extractValue(d, "shares");
        } catch (e) {
          extraErrors.push(`${mediaType}:${media.id.slice(-6)} ${e.message.slice(0, 60)}`);
        }
      }

      return post;
    }));

    // 4. Follower-growth snapshot — always write today's absolute count from profile.
    //    We never rely on the insights API for this so the chart fills in every sync.
    const today = new Date().toISOString().slice(0, 10);
    let profileInsights = (brand.instagram.profileInsights || []).filter(p => p.date !== today);
    profileInsights.push({ date: today, followers: currentFollowers, reach: 0, impressions: 0 });

    // Supplement with daily account-level reach (impressions removed in v22.0+)
    try {
      const since = Math.floor(Date.now() / 1000) - 30 * 86400;
      const until = Math.floor(Date.now() / 1000);
      const piRes = await igGet(
        `https://graph.facebook.com/v19.0/${userId}/insights` +
        `?metric=reach&period=day&since=${since}&until=${until}&access_token=${token}`
      );
      const dateMap = {};
      for (const metric of (piRes.data || [])) {
        for (const entry of (metric.values || [])) {
          const date = entry.end_time?.slice(0, 10);
          if (!date) continue;
          if (!dateMap[date]) dateMap[date] = {};
          dateMap[date][metric.name] = entry.value || 0;
        }
      }
      profileInsights = profileInsights.map(p =>
        dateMap[p.date] ? { ...p, reach: dateMap[p.date].reach || 0 } : p
      );
    } catch (e) {
      console.error("[instagram/sync] profile reach error:", e.message);
    }

    // Keep last 90 days, sorted ascending
    profileInsights = profileInsights
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-90);

    // 5. Persist
    await Brand.findByIdAndUpdate(id, {
      $set: {
        "instagram.followersCount":   currentFollowers,
        "instagram.username":         profile.username || brand.instagram.username,
        "instagram.lastSync":         new Date(),
        "instagram.posts":            posts,
        "instagram.profileInsights":  profileInsights,
      },
    });

    const withReach = posts.filter(p => p.reach > 0).length;
    return res.json({
      success:     true,
      synced:      posts.length,
      withReach,
      followers:   currentFollowers,
      insightDays: profileInsights.length,
      extraErrors: extraErrors.length ? extraErrors : undefined,
      message:     `Synced ${posts.length} posts · ${withReach} with reach · ${profileInsights.length} daily snapshots`,
    });

  } catch (err) {
    console.error("[instagram/sync]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
