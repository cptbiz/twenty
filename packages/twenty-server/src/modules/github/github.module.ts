import { Module } from '@nestjs/common';
import { GitHubResolver } from './github.resolver';
import { GitHubService } from './github.service';

@Module({
  providers: [GitHubService, GitHubResolver],
  exports: [GitHubService],
})
export class GitHubModule {}