# Audit patch contract

Mỗi file `AUD-<severity>-<number>.md` mô tả đúng một invariant và phải hoàn tất trước khi sửa code.

## Template

```md
# AUD-S0-000 — Tên finding

## Reproduction evidence
- Commit/base SHA:
- Persona và precondition:
- Request/UI action:
- Expected:
- Actual:
- Sanitized log/response:

## Root cause chain
DB/schema -> repository -> service/invariant owner -> downstream/fallback -> controller/gateway -> FE adapter/page

## Contract quyết định
- Owner service:
- Public API/type/status thay đổi:
- Compatibility:
- Fail-open/fail-closed:

## Patch boundary
- In scope:
- Explicitly out of scope:
- Rollback:

## Regression and acceptance
- Unit/service:
- Security roles/ownership:
- Contract/frontend:
- E2E/reload/DB assertion:
- Verify commands:
```

Không đưa patch vào `IN_FIX` khi reproduction/root-cause/contract/test trong file còn để trống.

Baseline và blocker môi trường hiện hành nằm ở `../BASELINE.md`; backlog/trạng thái duy nhất nằm ở `../AUDIT_BACKLOG.md`.
