import { WorkerEntrypoint } from "cloudflare:workers";
import {
  type HostedCommitAnswer,
  type HostedCommitRequest,
  type HostedContainsAnswer,
  type HostedContainsRequest,
  HostedGitService,
  type HostedPublishAnswer,
  type HostedPublishRequest
} from "@inferative/projects/infrastructure/git";

/**
 * The Git service of hosted repositories for the dashboard Worker: commits of files onto a work copy, Publish, and the
 * check whether a branch holds a commit. Each
 * call carries the tokens of its repositories, so this Worker holds no secret; the Git work runs in memory, in this
 * isolate and not in the dashboard Worker's.
 */
export class HostedGitEntrypoint extends WorkerEntrypoint {
  /**
   * @param request - The files and the work copy.
   * @returns The new commit, or why there is none.
   */
  public commit(request: HostedCommitRequest): Promise<HostedCommitAnswer> {
    return new HostedGitService().commit(request);
  }

  /**
   * @param request - The work copy, the repository and the commit.
   * @returns What moved, or why nothing did.
   */
  public publish(request: HostedPublishRequest): Promise<HostedPublishAnswer> {
    return new HostedGitService().publish(request);
  }

  /**
   * @param request - The repository, its branch and the commit.
   * @returns Whether the branch holds the commit.
   */
  public contains(request: HostedContainsRequest): Promise<HostedContainsAnswer> {
    return new HostedGitService().contains(request);
  }
}
