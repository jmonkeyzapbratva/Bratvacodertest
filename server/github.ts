import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('Token de autenticação Replit não encontrado');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token ?? connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub não conectado');
  }
  return accessToken;
}

export async function getGitHubClient(): Promise<Octokit> {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

export async function getGitHubUser() {
  const octokit = await getGitHubClient();
  const { data } = await octokit.users.getAuthenticated();
  return {
    login: data.login,
    name: data.name,
    email: data.email,
    avatarUrl: data.avatar_url,
  };
}

export async function listUserRepos() {
  const octokit = await getGitHubClient();
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 50,
  });
  return data.map(repo => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    private: repo.private,
    htmlUrl: repo.html_url,
    updatedAt: repo.updated_at,
  }));
}

export interface CreateRepoOptions {
  name: string;
  description?: string;
  isPrivate?: boolean;
}

export async function createRepository(options: CreateRepoOptions) {
  const octokit = await getGitHubClient();
  const { data } = await octokit.repos.createForAuthenticatedUser({
    name: options.name,
    description: options.description || 'Projeto gerado pelo BRATVACODER',
    private: options.isPrivate ?? false,
    auto_init: true,
  });
  return {
    id: data.id,
    name: data.name,
    fullName: data.full_name,
    htmlUrl: data.html_url,
    cloneUrl: data.clone_url,
  };
}

export interface CommitFilesOptions {
  owner: string;
  repo: string;
  files: Array<{ path: string; content: string }>;
  message: string;
  branch?: string;
}

export async function commitFiles(options: CommitFilesOptions) {
  const octokit = await getGitHubClient();
  const branch = options.branch || 'main';

  let latestCommitSha: string;
  let treeSha: string;

  try {
    const { data: ref } = await octokit.git.getRef({
      owner: options.owner,
      repo: options.repo,
      ref: `heads/${branch}`,
    });
    latestCommitSha = ref.object.sha;

    const { data: commit } = await octokit.git.getCommit({
      owner: options.owner,
      repo: options.repo,
      commit_sha: latestCommitSha,
    });
    treeSha = commit.tree.sha;
  } catch (error: any) {
    if (error.status === 404) {
      const { data: mainRef } = await octokit.git.getRef({
        owner: options.owner,
        repo: options.repo,
        ref: 'heads/main',
      });
      latestCommitSha = mainRef.object.sha;

      const { data: commit } = await octokit.git.getCommit({
        owner: options.owner,
        repo: options.repo,
        commit_sha: latestCommitSha,
      });
      treeSha = commit.tree.sha;
    } else {
      throw error;
    }
  }

  const blobs = await Promise.all(
    options.files.map(async (file) => {
      const { data } = await octokit.git.createBlob({
        owner: options.owner,
        repo: options.repo,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64',
      });
      return {
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: data.sha,
      };
    })
  );

  const { data: newTree } = await octokit.git.createTree({
    owner: options.owner,
    repo: options.repo,
    base_tree: treeSha,
    tree: blobs,
  });

  const { data: newCommit } = await octokit.git.createCommit({
    owner: options.owner,
    repo: options.repo,
    message: options.message,
    tree: newTree.sha,
    parents: [latestCommitSha],
  });

  await octokit.git.updateRef({
    owner: options.owner,
    repo: options.repo,
    ref: `heads/${branch}`,
    sha: newCommit.sha,
  });

  return {
    sha: newCommit.sha,
    url: newCommit.html_url,
    message: options.message,
  };
}

export async function isGitHubConnected(): Promise<boolean> {
  try {
    await getGitHubClient();
    return true;
  } catch {
    return false;
  }
}
