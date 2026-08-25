import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CodeBlock from "@tiptap/extension-code-block";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Code2,
  Quote,
  Link2,
} from "lucide-react";

interface MarkdownEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  minHeight?: number;
  maxLength?: number;
}

interface ToolbarButtonProps {
  onClick: () => boolean;
  isActive: boolean;
  label: string;
  icon: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, label, icon }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`rounded p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary ${
        isActive ? "bg-accent-subtle text-accent" : ""
      }`}
    >
      {icon}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-5 w-px bg-border" />;
}

export function MarkdownEditor({
  initialContent,
  onChange,
  placeholder = "Add notes or context...",
  editable = true,
  minHeight = 150,
  maxLength = 100000,
}: MarkdownEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlock,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-accent underline cursor-pointer",
        },
      }),
    ],
    content: initialContent || "",
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (html.length <= maxLength) {
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-base max-w-none focus:outline-none p-3 text-base text-text-primary placeholder-muted",
        "data-placeholder": placeholder,
        style: `min-height: ${minHeight}px;`,
      },
    },
  });

  if (!editor) {
    return (
      <div className="flex items-center justify-center rounded-md border border-border bg-bg-elevated p-4">
        <span className="text-sm text-text-muted">Loading editor...</span>
      </div>
    );
  }

  const contentLength = editor.getText().length;
  const nearLimit = contentLength > maxLength * 0.9;
  const atLimit = contentLength >= maxLength;

  const headingLevels = [
    {
      level: 1 as const,
      icon: <Heading1 className="h-4 w-4" />,
      label: "Heading 1",
    },
    {
      level: 2 as const,
      icon: <Heading2 className="h-4 w-4" />,
      label: "Heading 2",
    },
    {
      level: 3 as const,
      icon: <Heading3 className="h-4 w-4" />,
      label: "Heading 3",
    },
  ];

  return (
    <div
      className={`rounded-md border border-border bg-bg-elevated ${
        editable ? "" : "border-transparent bg-transparent"
      }`}
    >
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            label="Bold"
            icon={<Bold className="h-4 w-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            label="Italic"
            icon={<Italic className="h-4 w-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive("strike")}
            label="Strikethrough"
            icon={<Strikethrough className="h-4 w-4" />}
          />

          <ToolbarDivider />

          {headingLevels.map((h) => (
            <ToolbarButton
              key={h.level}
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: h.level }).run()
              }
              isActive={editor.isActive("heading", { level: h.level })}
              label={h.label}
              icon={h.icon}
            />
          ))}

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            label="Bullet List"
            icon={<List className="h-4 w-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            label="Ordered List"
            icon={<ListOrdered className="h-4 w-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive("taskList")}
            label="Task List"
            icon={<ListTodo className="h-4 w-4" />}
          />

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            label="Blockquote"
            icon={<Quote className="h-4 w-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive("codeBlock")}
            label="Code Block"
            icon={<Code2 className="h-4 w-4" />}
          />

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => {
              const previousUrl = editor.getAttributes("link").href as
                string | undefined;
              if (previousUrl) {
                editor.chain().focus().unsetLink().run();
                return true;
              }
              const url = window.prompt("Enter link URL:");
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
              return true;
            }}
            isActive={editor.isActive("link")}
            label="Link"
            icon={<Link2 className="h-4 w-4" />}
          />
        </div>
      )}

      {editable ? (
        <>
          <EditorContent editor={editor} />
          {nearLimit && (
            <div className="border-t border-border px-3 py-1.5">
              <p
                className={`text-xs ${atLimit ? "text-danger" : "text-warning"}`}
              >
                {atLimit
                  ? `Character limit reached (${maxLength.toLocaleString()})`
                  : `${contentLength.toLocaleString()} / ${maxLength.toLocaleString()} characters`}
              </p>
            </div>
          )}
        </>
      ) : (
        <div
          className="min-h-[150px] px-3 py-2 text-base text-text-primary prose prose-base max-w-none"
          style={{ minHeight: `${minHeight}px` }}
          dangerouslySetInnerHTML={{
            __html:
              editor.getHTML() ||
              '<p class="text-text-muted italic">No description</p>',
          }}
        />
      )}
    </div>
  );
}
