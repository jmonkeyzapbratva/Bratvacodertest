import { storage } from "./storage";
import crypto from "crypto";

export interface CodeComment {
  id: string;
  projectId: number;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  replies: CommentReply[];
}

export interface CommentReply {
  id: string;
  commentId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
}

export interface CommentThread {
  filePath: string;
  comments: CodeComment[];
}

const projectComments = new Map<number, CodeComment[]>();

function generateId(): string {
  return crypto.randomBytes(8).toString("hex");
}

export async function createComment(
  projectId: number,
  filePath: string,
  lineStart: number,
  lineEnd: number,
  content: string,
  authorId: string,
  authorName: string
): Promise<CodeComment> {
  const comment: CodeComment = {
    id: generateId(),
    projectId,
    filePath,
    lineStart,
    lineEnd,
    content,
    authorId,
    authorName,
    createdAt: new Date(),
    updatedAt: new Date(),
    resolved: false,
    replies: [],
  };
  
  let comments = projectComments.get(projectId);
  if (!comments) {
    comments = [];
    projectComments.set(projectId, comments);
  }
  
  comments.push(comment);
  return comment;
}

export async function getComment(
  projectId: number,
  commentId: string
): Promise<CodeComment | null> {
  const comments = projectComments.get(projectId);
  if (!comments) return null;
  
  return comments.find(c => c.id === commentId) || null;
}

export async function updateComment(
  projectId: number,
  commentId: string,
  content: string,
  userId: string
): Promise<CodeComment | null> {
  const comments = projectComments.get(projectId);
  if (!comments) return null;
  
  const comment = comments.find(c => c.id === commentId);
  if (!comment) return null;
  
  if (comment.authorId !== userId) {
    return null;
  }
  
  comment.content = content;
  comment.updatedAt = new Date();
  return comment;
}

export async function deleteComment(
  projectId: number,
  commentId: string,
  userId: string
): Promise<boolean> {
  const comments = projectComments.get(projectId);
  if (!comments) return false;
  
  const index = comments.findIndex(c => c.id === commentId);
  if (index === -1) return false;
  
  const comment = comments[index];
  if (comment.authorId !== userId) {
    return false;
  }
  
  comments.splice(index, 1);
  return true;
}

export async function resolveComment(
  projectId: number,
  commentId: string,
  userId: string
): Promise<CodeComment | null> {
  const comments = projectComments.get(projectId);
  if (!comments) return null;
  
  const comment = comments.find(c => c.id === commentId);
  if (!comment) return null;
  
  comment.resolved = true;
  comment.resolvedBy = userId;
  comment.resolvedAt = new Date();
  comment.updatedAt = new Date();
  
  return comment;
}

export async function unresolveComment(
  projectId: number,
  commentId: string
): Promise<CodeComment | null> {
  const comments = projectComments.get(projectId);
  if (!comments) return null;
  
  const comment = comments.find(c => c.id === commentId);
  if (!comment) return null;
  
  comment.resolved = false;
  comment.resolvedBy = undefined;
  comment.resolvedAt = undefined;
  comment.updatedAt = new Date();
  
  return comment;
}

export async function addReply(
  projectId: number,
  commentId: string,
  content: string,
  authorId: string,
  authorName: string
): Promise<CommentReply | null> {
  const comments = projectComments.get(projectId);
  if (!comments) return null;
  
  const comment = comments.find(c => c.id === commentId);
  if (!comment) return null;
  
  const reply: CommentReply = {
    id: generateId(),
    commentId,
    content,
    authorId,
    authorName,
    createdAt: new Date(),
  };
  
  comment.replies.push(reply);
  comment.updatedAt = new Date();
  
  return reply;
}

export async function deleteReply(
  projectId: number,
  commentId: string,
  replyId: string,
  userId: string
): Promise<boolean> {
  const comments = projectComments.get(projectId);
  if (!comments) return false;
  
  const comment = comments.find(c => c.id === commentId);
  if (!comment) return false;
  
  const replyIndex = comment.replies.findIndex(r => r.id === replyId);
  if (replyIndex === -1) return false;
  
  const reply = comment.replies[replyIndex];
  if (reply.authorId !== userId) {
    return false;
  }
  
  comment.replies.splice(replyIndex, 1);
  comment.updatedAt = new Date();
  
  return true;
}

export async function getProjectComments(
  projectId: number,
  filePath?: string,
  includeResolved?: boolean
): Promise<CodeComment[]> {
  const comments = projectComments.get(projectId) || [];
  
  let filtered = comments;
  
  if (filePath) {
    filtered = filtered.filter(c => c.filePath === filePath);
  }
  
  if (!includeResolved) {
    filtered = filtered.filter(c => !c.resolved);
  }
  
  return filtered.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getFileComments(
  projectId: number,
  filePath: string
): Promise<CodeComment[]> {
  const comments = projectComments.get(projectId) || [];
  return comments
    .filter(c => c.filePath === filePath)
    .sort((a, b) => a.lineStart - b.lineStart);
}

export async function getCommentsByLine(
  projectId: number,
  filePath: string,
  line: number
): Promise<CodeComment[]> {
  const comments = projectComments.get(projectId) || [];
  return comments.filter(c => 
    c.filePath === filePath && 
    line >= c.lineStart && 
    line <= c.lineEnd
  );
}

export async function getCommentThreads(
  projectId: number
): Promise<CommentThread[]> {
  const comments = projectComments.get(projectId) || [];
  
  const threadMap = new Map<string, CodeComment[]>();
  
  for (const comment of comments) {
    const existing = threadMap.get(comment.filePath);
    if (existing) {
      existing.push(comment);
    } else {
      threadMap.set(comment.filePath, [comment]);
    }
  }
  
  const threads: CommentThread[] = [];
  threadMap.forEach((comments, filePath) => {
    threads.push({
      filePath,
      comments: comments.sort((a, b) => a.lineStart - b.lineStart),
    });
  });
  
  return threads;
}

export async function getUnresolvedCount(projectId: number): Promise<number> {
  const comments = projectComments.get(projectId) || [];
  return comments.filter(c => !c.resolved).length;
}
