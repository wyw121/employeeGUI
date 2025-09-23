import { LocalSessionRepository } from '../../infrastructure/inspector/LocalSessionRepository';
import { LocalStepRepository } from '../../infrastructure/inspector/LocalStepRepository';
import { useInspectorStore } from '../inspectorStore';
import { AnalysisSession } from '../../domain/inspector/entities/AnalysisSession';
import { Step } from '../../domain/inspector/entities/Step';
import { NodeLocator } from '../../domain/inspector/entities/NodeLocator';
import { buildXPath } from '../../domain/inspector/utils/xpath';

function uuid() { return crypto?.randomUUID?.() || Math.random().toString(36).slice(2); }
function hashOf(text: string) {
  // 简易 hash：生产建议用稳定算法（如 SHA-256）
  let h = 0; for (let i = 0; i < text.length; i++) { h = ((h << 5) - h) + text.charCodeAt(i); h |= 0; }
  return String(h);
}

export class InspectorApplicationService {
  private sessionRepo = new LocalSessionRepository();
  private stepRepo = new LocalStepRepository();

  async openXml(xmlText: string, meta?: AnalysisSession['meta']): Promise<string> {
    const xmlHash = hashOf(xmlText);
    const existed = await this.sessionRepo.findByHash(xmlHash);
    const session: AnalysisSession = existed ?? {
      id: uuid(),
      xmlHash,
      xmlText,
      createdAt: Date.now(),
      meta,
    };
    if (!existed) await this.sessionRepo.save(session);
    const store = useInspectorStore.getState();
    store.ensureSession(session.id, session.xmlText, session.xmlHash);
    store.setActiveSession(session.id);
    return session.id;
  }

  async createStepFromSelection(sessionId: string, node: any, draft: { name: string; actionType: string; params?: Record<string, any> }): Promise<string> {
    const store = useInspectorStore.getState();
    const sess = store.sessions[sessionId];
    if (!sess) throw new Error('Session not found in store');
    const locator: NodeLocator = {
      absoluteXPath: buildXPath(node),
      // 可选：根据实际业务构造 predicateXPath/attributes
      attributes: {
        resourceId: node?.attrs?.['resource-id'],
        text: node?.attrs?.['text'],
        contentDesc: node?.attrs?.['content-desc'],
        className: node?.attrs?.['class'],
        packageName: node?.attrs?.['package'],
      },
      bounds: node?.attrs?.['bounds'],
    };
    const step: Step = {
      id: uuid(),
      sessionId,
      name: draft.name,
      actionType: draft.actionType,
      params: draft.params || {},
      locator,
      createdAt: Date.now(),
      xmlHash: sess.xmlHash,
      xmlSnapshot: sess.xmlText, // 冗余存一份，便于迁移
    };
    await this.stepRepo.save(step);
    return step.id;
  }

  async openStep(stepId: string): Promise<{ sessionId: string }> {
    const step = await this.stepRepo.get(stepId);
    if (!step) throw new Error('Step not found');
    // 确保会话在本地
    const store = useInspectorStore.getState();
    const existed = store.sessions[step.sessionId];
    if (!existed) {
      // 使用冗余 xmlSnapshot 优先注入
      if (!step.xmlSnapshot) throw new Error('Missing xml snapshot for step');
      store.ensureSession(step.sessionId, step.xmlSnapshot, step.xmlHash || '');
    }
    store.setActiveSession(step.sessionId);
    store.setActiveStep(stepId);
    return { sessionId: step.sessionId };
  }
}
