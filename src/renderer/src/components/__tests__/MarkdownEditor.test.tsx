import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockChain = {
  focus: () => mockChain,
  toggleBold: () => ({ run: vi.fn() }),
  toggleItalic: () => ({ run: vi.fn() }),
  toggleStrike: () => ({ run: vi.fn() }),
  toggleHeading: () => ({ run: vi.fn() }),
  toggleBulletList: () => ({ run: vi.fn() }),
  toggleOrderedList: () => ({ run: vi.fn() }),
  toggleTaskList: () => ({ run: vi.fn() }),
  toggleBlockquote: () => ({ run: vi.fn() }),
  toggleCodeBlock: () => ({ run: vi.fn() }),
  unsetLink: () => ({ run: vi.fn() }),
  setLink: () => ({ run: vi.fn() }),
};

function buildEditor(content: string, editable: boolean) {
  if (content === "__null__") return null;
  const html = content;
  return {
    chain: () => mockChain,
    isActive: () => false,
    getHTML: () => html,
    getText: () => html.replace(/<[^>]+>/g, "") || "Test content",
    getAttributes: () => ({}),
    isEditable: editable !== false,
  };
}

vi.mock("@tiptap/react", () => ({
  useEditor: ({ content, editable }: { content: string; editable: boolean }) =>
    buildEditor(content, editable),
  EditorContent: ({ editor }: { editor: unknown }) => {
    if (!editor) return null;
    return (
      <div role="textbox" contentEditable={true} className="ProseMirror" />
    );
  },
}));

import { MarkdownEditor } from "../MarkdownEditor";

describe("MarkdownEditor", () => {
  const onChange = vi.fn();

  it("renders without crashing (smoke test)", () => {
    render(<MarkdownEditor initialContent="" onChange={onChange} />);
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("renders all toolbar buttons", () => {
    render(<MarkdownEditor initialContent="" onChange={onChange} />);

    expect(screen.getByTitle("Bold")).toBeTruthy();
    expect(screen.getByTitle("Italic")).toBeTruthy();
    expect(screen.getByTitle("Strikethrough")).toBeTruthy();
    expect(screen.getByTitle("Heading 1")).toBeTruthy();
    expect(screen.getByTitle("Heading 2")).toBeTruthy();
    expect(screen.getByTitle("Heading 3")).toBeTruthy();
    expect(screen.getByTitle("Bullet List")).toBeTruthy();
    expect(screen.getByTitle("Ordered List")).toBeTruthy();
    expect(screen.getByTitle("Task List")).toBeTruthy();
    expect(screen.getByTitle("Blockquote")).toBeTruthy();
    expect(screen.getByTitle("Code Block")).toBeTruthy();
    expect(screen.getByTitle("Link")).toBeTruthy();
  });

  it("shows editor in editable mode by default (toolbar visible)", () => {
    render(<MarkdownEditor initialContent="" onChange={onChange} />);

    expect(screen.getByTitle("Bold")).toBeTruthy();
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("renders in read-only preview mode when editable=false", () => {
    render(
      <MarkdownEditor
        initialContent="<p>Preview content</p>"
        onChange={onChange}
        editable={false}
      />,
    );

    expect(screen.queryByTitle("Bold")).toBeNull();
    expect(screen.getByText("Preview content")).toBeTruthy();
  });

  it("shows 'No description' fallback in preview mode with empty content", () => {
    render(
      <MarkdownEditor initialContent="" onChange={onChange} editable={false} />,
    );

    expect(screen.getByText("No description")).toBeTruthy();
  });

  it("shows loading state when editor is null", () => {
    render(<MarkdownEditor initialContent="__null__" onChange={onChange} />);

    expect(screen.getByText("Loading editor...")).toBeTruthy();
  });

  it("renders HTML content in preview mode", () => {
    render(
      <MarkdownEditor
        initialContent="<p>Hello <strong>world</strong></p>"
        onChange={onChange}
        editable={false}
      />,
    );

    const container = document.querySelector(".prose");
    expect(container).toBeTruthy();
    expect(container?.innerHTML).toContain("<strong>world</strong>");
  });

  it("toolbar bold button has correct title", () => {
    render(<MarkdownEditor initialContent="" onChange={onChange} />);

    const btn = screen.getByTitle("Bold");
    expect(btn).toBeTruthy();
  });

  it("toolbar heading buttons present with correct titles", () => {
    render(<MarkdownEditor initialContent="" onChange={onChange} />);

    expect(screen.getByTitle("Heading 1")).toBeTruthy();
    expect(screen.getByTitle("Heading 2")).toBeTruthy();
    expect(screen.getByTitle("Heading 3")).toBeTruthy();
  });
});
