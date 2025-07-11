import { Injectable } from '@nestjs/common';

export interface GitHubMergeRequest {
  repository: string;
  sourceBranch: string;
  targetBranch: string;
  title: string;
  description?: string;
}

export interface GitHubMergeResponse {
  success: boolean;
  pullRequestUrl?: string;
  error?: string;
}

@Injectable()
export class GitHubService {
  constructor() {}

  async mergeBranches(mergeRequest: GitHubMergeRequest): Promise<GitHubMergeResponse> {
    try {
      // Extract owner and repo from repository string (e.g., "owner/repo")
      const [owner, repo] = mergeRequest.repository.split('/');
      
      if (!owner || !repo) {
        throw new Error('Invalid repository format. Use "owner/repo"');
      }

      // GitHub API configuration
      const githubToken = process.env.GITHUB_TOKEN;
      if (!githubToken) {
        throw new Error('GitHub token not configured');
      }

      // First, create a pull request
      const pullRequestResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: mergeRequest.title,
            body: mergeRequest.description || '',
            head: mergeRequest.sourceBranch,
            base: mergeRequest.targetBranch,
          }),
        }
      );

      if (!pullRequestResponse.ok) {
        const errorData = await pullRequestResponse.json();
        throw new Error(`Failed to create pull request: ${errorData.message}`);
      }

      const pullRequestData = await pullRequestResponse.json();
      const pullRequestNumber = pullRequestData.number;

      // Automatically merge the pull request
      const mergeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${pullRequestNumber}/merge`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            commit_title: mergeRequest.title,
            commit_message: mergeRequest.description || '',
            merge_method: 'merge', // Options: merge, squash, rebase
          }),
        }
      );

      if (!mergeResponse.ok) {
        const errorData = await mergeResponse.json();
        throw new Error(`Failed to merge pull request: ${errorData.message}`);
      }

      return {
        success: true,
        pullRequestUrl: pullRequestData.html_url,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async createPullRequest(mergeRequest: GitHubMergeRequest): Promise<GitHubMergeResponse> {
    try {
      const [owner, repo] = mergeRequest.repository.split('/');
      
      if (!owner || !repo) {
        throw new Error('Invalid repository format. Use "owner/repo"');
      }

      const githubToken = process.env.GITHUB_TOKEN;
      if (!githubToken) {
        throw new Error('GitHub token not configured');
      }

      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: mergeRequest.title,
            body: mergeRequest.description || '',
            head: mergeRequest.sourceBranch,
            base: mergeRequest.targetBranch,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create pull request: ${errorData.message}`);
      }

      const data = await response.json();

      return {
        success: true,
        pullRequestUrl: data.html_url,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}