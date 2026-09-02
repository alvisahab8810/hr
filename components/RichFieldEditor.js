// components/RichFieldEditor.js — compact rich-text editor for the Website
// section forms (payroll design system). Toolbar: bold / italic / underline /
// bullet list / numbered list, plus an optional link button (`withLink`).
// Emits clean HTML (p, ul/ol, li, strong, em, u, a) that the website renders
// inside its existing styles.
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import LinkExt from "@tiptap/extension-link";
import { useEffect, useMemo, useState } from "react";

function ToolBtn({ active, title, onClick, icon }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()} // keep editor focus
      onClick={onClick}
      style={{
        width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? "#EEF2FF" : "transparent",
        color: active ? "#6366F1" : "#64748B",
        transition: "background .12s",
      }}
    >
      <i className={`bi ${icon}`} style={{ fontSize: 13.5 }} />
    </button>
  );
}

export default function RichFieldEditor({ value, onChange, placeholder, minHeight = 120, withLink = false }) {
  // Link is opt-in so the forms that shipped before it keep the exact same
  // toolbar; FAQ answers turn it on so answers can point at other pages.
  const extensions = useMemo(() => {
    const list = [StarterKit, Underline];
    if (withLink) {
      list.push(
        LinkExt.configure({
          openOnClick: false,
          autolink: false,
          HTMLAttributes: { rel: "noopener noreferrer" },
        })
      );
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withLink]);

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions,
    content: value || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep in sync when the parent swaps the value (e.g. opening another post).
  useEffect(() => {
    if (editor && (value || "") !== editor.getHTML()) {
      editor.commands.setContent(value || "", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) {
    return <div style={{ minHeight: minHeight + 41, border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff" }} />;
  }

  const isEmpty = editor.isEmpty;

  // Apply the typed URL to the current selection (or the word the caret is in
  // when the link already exists). An empty box just removes the link.
  const applyLink = () => {
    const href = linkUrl.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!href) chain.unsetLink().run();
    else chain.setLink({ href }).run();
    setLinkOpen(false);
  };

  return (
    <div className="rfe-wrap" style={{
      border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff",
      overflow: "hidden", position: "relative",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 2,
        padding: "5px 8px", borderBottom: "1px solid #F1F5F9", background: "#F8FAFC",
      }}>
        <ToolBtn icon="bi-type-bold"      title="Bold"          active={editor.isActive("bold")}        onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolBtn icon="bi-type-italic"    title="Italic"        active={editor.isActive("italic")}      onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolBtn icon="bi-type-underline" title="Underline"     active={editor.isActive("underline")}   onClick={() => editor.chain().focus().toggleUnderline().run()} />
        <div style={{ width: 1, height: 18, background: "#E2E8F0", margin: "0 5px" }} />
        <ToolBtn icon="bi-list-ul"        title="Bullet list"   active={editor.isActive("bulletList")}  onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolBtn icon="bi-list-ol"        title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        {withLink && (
          <>
            <div style={{ width: 1, height: 18, background: "#E2E8F0", margin: "0 5px" }} />
            <ToolBtn
              icon="bi-link-45deg" title="Insert / edit link"
              active={editor.isActive("link")}
              onClick={() => {
                setLinkUrl(editor.getAttributes("link").href || "");
                setLinkOpen((o) => !o);
              }}
            />
            {editor.isActive("link") && (
              <ToolBtn
                icon="bi-x-circle" title="Remove link"
                active={false}
                onClick={() => { editor.chain().focus().unsetLink().run(); setLinkOpen(false); }}
              />
            )}
          </>
        )}
      </div>

      {withLink && linkOpen && (
        <div style={{
          display: "flex", gap: 6, alignItems: "center",
          padding: "7px 8px", borderBottom: "1px solid #F1F5F9", background: "#FAFAFF",
        }}>
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyLink(); } }}
            placeholder="https://viralon.in/our-services/seo  or  /contact-us"
            style={{
              flex: 1, height: 32, border: "1px solid #E2E8F0", borderRadius: 8,
              padding: "0 10px", fontSize: 12.5, color: "#1E293B", outline: "none",
            }}
          />
          <button
            type="button" onClick={applyLink}
            style={{
              height: 32, padding: "0 12px", borderRadius: 8, border: "none", cursor: "pointer",
              background: "#6366F1", color: "#fff", fontSize: 12, fontWeight: 700,
            }}
          >
            Apply
          </button>
        </div>
      )}
      {isEmpty && placeholder && (
        <div style={{
          position: "absolute", top: 51, left: 15, right: 15,
          fontSize: 13.5, color: "#B6BFCD", pointerEvents: "none", lineHeight: 1.55,
          whiteSpace: "pre-line",
        }}>
          {placeholder}
        </div>
      )}
      <EditorContent editor={editor} style={{ minHeight }} className="rfe-content" />
    </div>
  );
}
