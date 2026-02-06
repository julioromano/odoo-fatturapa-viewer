# resolve-version

Composite action to parse and validate semver tags used by the release and publish workflows.

## Inputs

- `tag` (required): Tag name to parse, e.g. `v1.2.3` or `v1.2.3-rc.1`.
- `allow-prerelease` (optional, default: `true`): Whether prerelease tags are allowed.

## Outputs

- `tag`: The original tag.
- `version`: The parsed semver without the leading `v`.
- `prerelease`: `true` when the tag includes a prerelease suffix.

## Example

```yaml
- name: Resolve version
  id: version
  uses: ./.github/actions/resolve-version
  with:
    tag: ${{ github.ref_name }}
    allow-prerelease: "false"
```
