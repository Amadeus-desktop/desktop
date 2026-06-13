# Phase 07. MVP Closeout

## Goal

Desktop MVP를 실제로 닫는다. 새 기능 추가보다 회귀 방지, 테스트, 문서 일치를 우선한다.

## Scope

- Rust tests 전체 통과
- frontend build 통과
- trigger policy tests 보강
- provider input safety tests
- sidecar status tests
- manual UX smoke test
- architecture docs와 current behavior 차이 목록화

## Excluded

- release build
- Supabase production deployment
- Web launch
- OCR production feature

## Verification

```bash
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
pnpm build
```

Manual smoke:

- 앱 실행
- settings load/save
- provider route 변경
- trigger manual run
- bubble 표시/닫기/무시
- timeline 확인

## Exit Criteria

- MVP demo path가 깨지지 않는다.
- known risk가 문서화되어 있다.
- 다음 phase가 Web/Supabase인지 OCR인지 명확히 선택 가능하다.
