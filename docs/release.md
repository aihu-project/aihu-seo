# Release contract

The release workflow publishes only `@aihu/seo` version `1.0.6` from the
reviewed merge commit. The tag workflow can prove that the tag points at the
same commit as `GITHUB_SHA`, that the commit is reachable from the default
branch, and that GitHub identifies it as the merge commit of a merged pull
request into that branch. Review enforcement itself remains a repository
branch-protection setting; the workflow cannot recreate a review decision from
Git objects alone.

Before a release, a maintainer must:

1. Merge the reviewed hardening pull request into the repository default branch.
2. Confirm the merge commit is the intended `1.0.6` source and that CI passed.
3. From an up-to-date default-branch checkout, record `MERGE_SHA=$(git rev-parse HEAD)`.
4. Create and push the lightweight tag at that exact head:

   ```sh
   test "$(git rev-parse HEAD)" = "$MERGE_SHA"
   git tag v1.0.6 "$MERGE_SHA"
   git push origin v1.0.6
   ```

The workflow checks the package version, the tag target, default-branch
ancestry, and merged pull-request association before installing dependencies or
publishing. It has no manual dispatch and does not accept a commit SHA or branch
as a mutable workflow input.

This standalone repository retains the filtered repository ancestry available at
the time it was bootstrapped. The original SEO package introduction is
`965cba0a13d2979551e9f71cdf034dab9e5869af`, and the standalone bootstrap is
`e3c8a82d764ec577084890e28ffbfbca742332e1`; this document records those
provenance anchors without claiming that a filtered checkout contains every
unrelated commit from the source repository.
