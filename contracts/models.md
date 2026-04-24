# Shared Data Models — DocPanther API Contracts

All sub-agents must use these exact field names and types in request/response DTOs.
Do NOT rename, add, or remove fields without control agent approval.

---

## User

```json
{
  "id": "uuid",
  "email": "string",
  "name": "string",
  "avatarUrl": "string|null",
  "emailVerified": "boolean",
  "createdAt": "ISO8601"
}
```

## Tenant

```json
{
  "id": "uuid",
  "slug": "string",
  "name": "string",
  "region": "ap-south-1|us-east-1|eu-central-1|me-central-1",
  "plan": "FREE|STARTER|GROWTH|ENTERPRISE",
  "logoUrl": "string|null",
  "createdAt": "ISO8601"
}
```

## Case

```json
{
  "id": "uuid",
  "folderId": "uuid|null",
  "referenceNo": "string",
  "customerName": "string",
  "customerEmail": "string",
  "tags": ["string"],
  "status": "PENDING|PARTIAL|COMPLETE",
  "storageMode": "FLAT|STRUCTURED",
  "uploadUrl": "string",
  "expiresAt": "ISO8601|null",
  "maxFileSizeMb": "integer",
  "allowedFileTypes": ["string"],
  "totalItems": "integer",
  "uploadedItems": "integer",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

## ChecklistItem

```json
{
  "id": "uuid",
  "caseId": "uuid",
  "name": "string",
  "description": "string|null",
  "type": "FILE_UPLOAD|TEXT_INPUT",
  "required": "boolean",
  "allowMultiple": "boolean",
  "status": "PENDING|UPLOADED|APPROVED|REJECTED",
  "textValue": "string|null",
  "maxFileSizeMb": "integer|null",
  "allowedFileTypes": ["string"],
  "sortOrder": "integer",
  "documents": ["Document"],
  "createdAt": "ISO8601"
}
```

## Document

```json
{
  "id": "uuid",
  "checklistItemId": "uuid",
  "caseId": "uuid",
  "filename": "string",
  "contentType": "string",
  "sizeBytes": "integer",
  "uploadedAt": "ISO8601"
}
```

## Folder

```json
{
  "id": "uuid",
  "parentId": "uuid|null",
  "name": "string",
  "ownerId": "uuid",
  "permission": "OWNER|EDIT|VIEW",
  "childCount": "integer",
  "caseCount": "integer",
  "fileCount": "integer",
  "createdAt": "ISO8601"
}
```

## FileNode (directly uploaded file, not via case)

```json
{
  "id": "uuid",
  "folderId": "uuid",
  "name": "string",
  "contentType": "string",
  "sizeBytes": "integer",
  "uploadedBy": "uuid",
  "uploadedAt": "ISO8601"
}
```

## ShareLink

```json
{
  "id": "uuid",
  "documentId": "uuid",
  "token": "string",
  "isPasswordProtected": "boolean",
  "expiresAt": "ISO8601|null",
  "maxViews": "integer|null",
  "viewCount": "integer",
  "createdAt": "ISO8601"
}
```

## AuditLog

```json
{
  "id": "uuid",
  "action": "string",
  "actorType": "ADMIN|CUSTOMER",
  "actorId": "uuid|null",
  "metadata": "object",
  "createdAt": "ISO8601"
}
```

## Error Response (ALL error responses must use this shape)

```json
{
  "code": "string",
  "message": "string",
  "timestamp": "ISO8601"
}
```

## Pagination Wrapper (ALL paginated list responses must use this shape)

```json
{
  "content": ["T"],
  "page": "integer",
  "size": "integer",
  "totalElements": "integer",
  "totalPages": "integer"
}
```

## JWT Claims

```json
{
  "sub": "userId (UUID string)",
  "email": "string",
  "tenantId": "UUID string | null (null for individual users)",
  "type": "access",
  "iat": "epoch seconds",
  "exp": "epoch seconds"
}
```
