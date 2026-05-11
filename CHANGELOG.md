# Changelog

All notable changes to this project will be documented in this file.

## v1.0.7

- Fix iOS PWA not receiving push notifications (#143)
- Add editable workspace names so runners can pick by name in the dropdown (#144)
- Fix label dropdown getting clipped by dialog by opening it above the trigger (#142)
- Fix scheduled task dispatch timing by configuring timezone in Docker deploy (#141)
- Fix task dispatcher crash by resolving flowy-shared to source in vitest (#140)
- Fix inconsistent font size on mobile for date/time inputs in task dialog (#139)
- Fix scheduled tasks firing at wrong time when server is in a different timezone (#138)
- Add backend task dispatcher to promote due scheduled tasks (#137)
- Fix deploy-runner CI by including shared and root paths in trigger (#136)
- Fix deploy-runner CI by building shared package before runner (#135)
- Improve mobile PWA layout consistency and iOS behavior (#134)
- Fix deploy-self-hosted CI by compiling shared package to JS (#133)
- Fix sticky headers overlapping notch/status bar on PWA mobile pages (#132)
- Add task due-date notification scheduler for PWA push notifications (#131)
- De-duplicate types, utilities, and tests across monorepo (#130)
- Add list workspaces and task templates (#129)
- Replace textarea+preview with TipTap WYSIWYG markdown editor (#128)
- Reorganize task form into two-row layout with split recurrence editor (#127)
- Fix session message ordering, add WebSocket streaming and auto-title generation (#125)
