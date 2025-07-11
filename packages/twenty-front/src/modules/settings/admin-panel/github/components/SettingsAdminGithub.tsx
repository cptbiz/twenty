import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { TextInput } from '@/ui/input/components/TextInput';
import styled from '@emotion/styled';
import { t } from '@lingui/core/macro';
import { useState } from 'react';
import { H2Title } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { Section } from 'twenty-ui/layout';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
`;

const StyledInputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
`;

const StyledButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(2)};
  align-items: center;
`;

interface GitHubMergeRequest {
  repository: string;
  sourceBranch: string;
  targetBranch: string;
  title: string;
  description?: string;
}

export const SettingsAdminGithub = () => {
  const [repository, setRepository] = useState('');
  const [sourceBranch, setSourceBranch] = useState('');
  const [targetBranch, setTargetBranch] = useState('main');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { enqueueSnackBar } = useSnackBar();

  const handleMergeFiles = async () => {
    if (!repository || !sourceBranch || !targetBranch || !title) {
      enqueueSnackBar({
        message: t`Please fill in all required fields`,
        variant: 'error',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // TODO: Implement GitHub API call for merging
      const mergeRequest: GitHubMergeRequest = {
        repository,
        sourceBranch,
        targetBranch,
        title,
        description,
      };

      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      enqueueSnackBar({
        message: t`Files merged successfully!`,
        variant: 'success',
      });

      // Reset form
      setRepository('');
      setSourceBranch('');
      setTargetBranch('main');
      setTitle('');
      setDescription('');
      
    } catch (error) {
      enqueueSnackBar({
        message: t`Failed to merge files. Please try again.`,
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StyledContainer>
      <Section>
        <H2Title
          title={t`GitHub File Merge`}
          description={t`Merge files between branches in your GitHub repositories`}
        />
        
        <StyledInputGroup>
          <TextInput
            instanceId="github-repository"
            value={repository}
            onChange={setRepository}
            placeholder={t`Repository (e.g., owner/repo-name)`}
            fullWidth
            disabled={isLoading}
          />
          
          <TextInput
            instanceId="github-source-branch"
            value={sourceBranch}
            onChange={setSourceBranch}
            placeholder={t`Source branch`}
            fullWidth
            disabled={isLoading}
          />
          
          <TextInput
            instanceId="github-target-branch"
            value={targetBranch}
            onChange={setTargetBranch}
            placeholder={t`Target branch (default: main)`}
            fullWidth
            disabled={isLoading}
          />
          
          <TextInput
            instanceId="github-merge-title"
            value={title}
            onChange={setTitle}
            placeholder={t`Merge title`}
            fullWidth
            disabled={isLoading}
          />
          
          <TextInput
            instanceId="github-merge-description"
            value={description}
            onChange={setDescription}
            placeholder={t`Merge description (optional)`}
            fullWidth
            disabled={isLoading}
          />
        </StyledInputGroup>

        <StyledButtonGroup>
          <Button
            variant="primary"
            accent="blue"
            title={t`Merge Files`}
            onClick={handleMergeFiles}
            disabled={isLoading || !repository || !sourceBranch || !title}
          />
          {isLoading && <span>{t`Merging...`}</span>}
        </StyledButtonGroup>
      </Section>
    </StyledContainer>
  );
};