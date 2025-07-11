import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GitHubMergeResponse, GitHubService } from './github.service';

@Resolver()
export class GitHubResolver {
  constructor(private readonly githubService: GitHubService) {}

  @Mutation(() => GitHubMergeResponseType)
  async mergeBranches(
    @Args('input') input: GitHubMergeInput,
  ): Promise<GitHubMergeResponse> {
    return this.githubService.mergeBranches(input);
  }

  @Mutation(() => GitHubMergeResponseType)
  async createPullRequest(
    @Args('input') input: GitHubMergeInput,
  ): Promise<GitHubMergeResponse> {
    return this.githubService.createPullRequest(input);
  }
}

// GraphQL Types
import { Field, InputType, ObjectType } from '@nestjs/graphql';

@InputType()
export class GitHubMergeInput {
  @Field()
  repository: string;

  @Field()
  sourceBranch: string;

  @Field()
  targetBranch: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;
}

@ObjectType()
export class GitHubMergeResponseType {
  @Field()
  success: boolean;

  @Field({ nullable: true })
  pullRequestUrl?: string;

  @Field({ nullable: true })
  error?: string;
}