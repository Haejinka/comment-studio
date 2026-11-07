# Contributing

Thanks for helping improve Comment Studio.

## Report a bug

Use the [bug report form](https://github.com/Haejinka/comment-studio/issues/new?template=bug_report.yml). Include the version, Windows/browser edition, platform/template, steps, expected result, and actual result. A small screenshot or non-personal sample comment helps.

## Suggest an improvement

Use the [feature request form](https://github.com/Haejinka/comment-studio/issues/new?template=feature_request.yml). Explain the workflow it would improve and what a useful result looks like.

## Make a change

1. Read the [developer guide](docs/DEVELOPMENT.md).
2. Create a branch and keep the change focused.
3. Run the checks relevant to the change. The browser suite uses real PNG and ZIP decoding; native changes also need Rust tests.
4. For visible UI/template changes, attach a screenshot with fictitious example content.
5. Open a pull request describing the problem, resulting behavior, and validation.

Do not commit dependency folders, Rust build outputs, local drafts, test profiles, credentials, or Windows executables. Downloadable builds belong in Releases. Keep third-party license notices with bundled assets.

For documentation, use plain instructions and visible control names. A nontechnical user should be able to follow the Windows quick start without installing development tools.
