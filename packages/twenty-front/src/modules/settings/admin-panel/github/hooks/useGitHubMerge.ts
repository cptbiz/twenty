import { gql, useMutation } from '@apollo/client';

const MERGE_BRANCHES_MUTATION = gql`
  mutation MergeBranches($input: GitHubMergeInput!) {
    mergeBranches(input: $input) {
      success
      pullRequestUrl
      error
    }
  }
`;

const CREATE_PULL_REQUEST_MUTATION = gql`
  mutation CreatePullRequest($input: GitHubMergeInput!) {
    createPullRequest(input: $input) {
      success
      pullRequestUrl
      error
    }
  }
`;

export interface GitHubMergeInput {
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

export const useGitHubMerge = () => {
  const [mergeBranches, { loading: mergeLoading }] = useMutation<
    { mergeBranches: GitHubMergeResponse },
    { input: GitHubMergeInput }
  >(MERGE_BRANCHES_MUTATION);

  const [createPullRequest, { loading: prLoading }] = useMutation<
    { createPullRequest: GitHubMergeResponse },
    { input: GitHubMergeInput }
  >(CREATE_PULL_REQUEST_MUTATION);

  const handleMergeBranches = async (input: GitHubMergeInput): Promise<GitHubMergeResponse> => {
    try {
      const { data } = await mergeBranches({
        variables: { input },
      });
      return data?.mergeBranches || { success: false, error: 'No response data' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  };

  const handleCreatePullRequest = async (input: GitHubMergeInput): Promise<GitHubMergeResponse> => {
    try {
      const { data } = await createPullRequest({
        variables: { input },
      });
      return data?.createPullRequest || { success: false, error: 'No response data' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  };

  return {
    mergeBranches: handleMergeBranches,
    createPullRequest: handleCreatePullRequest,
    mergeLoading,
    prLoading,
    isLoading: mergeLoading || prLoading,
  };
};