# CLAUDE.md — dashboard-web-agent

Own ONLY `app/(app)/dashboard/` and `app/(app)/folder/`. Do not touch any other directory.

## Routes to build
```
/dashboard          → root file system view (top-level folders + files + cases summary)
/folder/[id]        → folder contents (subfolders + files)
```

## API endpoints to call
Read `../../../../contracts/openapi.yaml` paths tagged `filesystem`.

| Action | Endpoint |
|---|---|
| List root contents | `GET /api/fs/folders/root` |
| List folder contents | `GET /api/fs/folders/{id}` |
| Create folder | `POST /api/fs/folders` |
| Rename folder | `PUT /api/fs/folders/{id}` |
| Delete folder | `DELETE /api/fs/folders/{id}` |
| List files in folder | `GET /api/fs/files?folderId={id}` |
| Delete file | `DELETE /api/fs/files/{id}` |
| Upload file directly | `POST /api/fs/files/upload-url` → PUT to S3 → `POST /api/fs/files/confirm` |
| Search | `GET /api/fs/search?q={query}` |
| Share folder/file | `POST /api/sharing/links` |

## Layout
Split-pane layout:
- **Left sidebar** (240px): folder tree (recursive), "New Folder" button at top
- **Right main area**: breadcrumb → grid/list toggle → file + folder grid

```
┌─────────────────┬──────────────────────────────────────┐
│  📁 My Files    │  Home > Documents                    │
│  ├ Documents    │  [New Folder] [Upload]  ≡ ⊞          │
│  ├ Cases        │                                       │
│  └ Education    │  📁 Documents   📁 Cases   📄 file.pdf│
│                 │                                       │
└─────────────────┴──────────────────────────────────────┘
```

## Key behaviors
- Folder tree in sidebar: expandable/collapsible, highlights active folder
- Click folder → navigate to `/folder/[id]`
- Right-click or `⋮` menu on item → Rename / Delete / Share / Download
- Drag-to-upload: drop files on main area → trigger upload flow
- Upload flow: get presigned URL → PUT to S3 → confirm → refresh file list
- Search bar in top nav → calls `GET /api/fs/search` → shows results overlay

## Design rules — follow EXACTLY
Read `../../../CLAUDE.md` (web control agent) for the full design system.

Key requirements:
- Sidebar: `bg-zinc-50 border-r border-zinc-100`
- Active folder in sidebar: `bg-orange-50 text-orange-700 font-medium rounded-lg`
- File/folder cards: `bg-white rounded-xl border border-zinc-100 hover:border-orange-200 hover:shadow-sm transition-all`
- Folder icon: orange tint — use Lucide `Folder` icon with `text-orange-400`
- File icon: zinc — use Lucide `File` icon with `text-zinc-400`
- Upload drop zone: dashed border `border-2 border-dashed border-orange-200 rounded-2xl bg-orange-50`

## Do NOT
- Implement case logic — link to `/cases` for case actions
- Implement education logic — link to `/education` for education actions
- Call endpoints not listed above
