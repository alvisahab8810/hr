// import { getServerSession } from "next-auth/next";
// import { authOptions } from "@/pages/api/auth/[...nextauth]";
// import dbConnect from "@/utils/dbConnect";
// import User from "@/models/User";

// export async function getAdminFromReq(req, res) {
//   const session = await getServerSession(req, res, authOptions);

//   if (!session || !session.user?.id) return null;

//   await dbConnect();

//   const user = await User.findById(session.user.id).lean();
//   if (!user || user.role !== "admin") return null;

//   return user;
// }




import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/utils/dbConnect";
import User from "@/models/User";

export async function getAdminFromReq(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.id) {
    return null;
  }

  await dbConnect();

  const user = await User.findById(session.user.id).lean();
  if (!user) return null;

  if (user.role !== "admin") return null;

  return user;
}
