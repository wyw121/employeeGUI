import { useInspectorStore } from '../inspectorStore';
import { DistributedScriptManager, DistributedStep } from '../../domain/distributed-script';
import { LocatorService } from '../../infrastructure/inspector/LocatorService';
import { parseUiAutomatorXml, attachParents } from '../../components/universal-ui/views/grid-view/utils';
import { buildXPath } from '../../domain/inspector/utils/xpath';

/**
 * 分布式检查器应用服务
 * 专为跨设备、无本地缓存的场景设计
 */
export class DistributedInspectorService {
  private locatorService = new LocatorService();

  /**
   * 从分布式步骤创建临时会话（不持久化）
   * 用于"修改参数"时快速恢复 XML 环境
   */
  async openStepXmlContext(step: DistributedStep): Promise<{
    sessionId: string;
    xmlContent: string;
    parsedRoot: any;
    locatedNode: any | null;
  }> {
    const { xmlSnapshot, locator } = step;
    const sessionId = `temp_${step.id}_${Date.now()}`;
    
    // 创建临时会话
    const store = useInspectorStore.getState();
    store.ensureSession(sessionId, xmlSnapshot.xmlContent, xmlSnapshot.xmlHash);
    store.setActiveSession(sessionId);
    store.setActiveStep(step.id);

    // 解析 XML
    const parsedRoot = parseUiAutomatorXml(xmlSnapshot.xmlContent);
    if (parsedRoot) {
      attachParents(parsedRoot);
    }

    // 尝试定位原始节点
    let locatedNode = null;
    if (parsedRoot && locator) {
      try {
        locatedNode = this.locatorService.resolve(parsedRoot, locator);
      } catch (error) {
        console.warn('节点定位失败，XML结构可能已变化:', error);
      }
    }

    return {
      sessionId,
      xmlContent: xmlSnapshot.xmlContent,
      parsedRoot: parsedRoot || null,
      locatedNode,
    };
  }

  /**
   * 创建分布式步骤（包含完整 XML 快照）
   */
  async createDistributedStepFromSelection(
    xmlContent: string,
    selectedNode: any,
    stepData: {
      name: string;
      actionType: string;
      params?: Record<string, any>;
      description?: string;
    },
    deviceInfo?: any,
    pageInfo?: any
  ): Promise<DistributedStep> {
    
    return DistributedScriptManager.createDistributedStep(
      {
        id: `step_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: stepData.name,
        actionType: stepData.actionType,
        params: stepData.params || {},
        locator: this.extractNodeLocator(selectedNode),
        createdAt: Date.now(),
        description: stepData.description,
      },
      xmlContent,
      deviceInfo,
      pageInfo
    );
  }

  /**
   * 从节点提取定位器信息
   */
  private extractNodeLocator(node: any): import('../../domain/inspector/entities/NodeLocator').NodeLocator {
    // 使用现有的 buildXPath 函数（ESM 导入）
    return {
      absoluteXPath: buildXPath(node),
      attributes: {
        resourceId: node?.attrs?.['resource-id'],
        text: node?.attrs?.['text'],
        contentDesc: node?.attrs?.['content-desc'],
        className: node?.attrs?.['class'],
        packageName: node?.attrs?.['package'],
      },
      bounds: node?.attrs?.['bounds'],
    };
  }

  /**
   * 批量更新脚本中的步骤XML快照
   * 用于脚本维护：当界面更新时，批量重新采集XML
   */
  async updateScriptXmlSnapshots(
    scriptSteps: DistributedStep[],
    getCurrentXml: () => Promise<string>,
    deviceInfo?: any
  ): Promise<DistributedStep[]> {
    const currentXml = await getCurrentXml();
    
    return scriptSteps.map(step => ({
      ...step,
      xmlSnapshot: {
        ...step.xmlSnapshot,
        xmlContent: currentXml,
        xmlHash: DistributedScriptManager['computeXmlHash'](currentXml),
        timestamp: Date.now(),
        deviceInfo,
      }
    }));
  }

  /**
   * 验证步骤在当前环境中的可执行性
   */
  async validateStepExecutability(
    step: DistributedStep,
    currentXml?: string
  ): Promise<{
    executable: boolean;
    confidence: number; // 0-1，越高越可能成功
    fallbackSuggestions: string[];
  }> {
    if (!currentXml) {
      return {
        executable: true, // 假设可执行，运行时再检查
        confidence: 0.5,
        fallbackSuggestions: ['建议先获取当前页面XML进行验证']
      };
    }

    const currentRoot = parseUiAutomatorXml(currentXml);
    if (!currentRoot) {
      return {
        executable: false,
        confidence: 0,
        fallbackSuggestions: ['当前页面XML解析失败']
      };
    }

    attachParents(currentRoot);
    const locatedNode = this.locatorService.resolve(currentRoot, step.locator);

    if (locatedNode) {
      return {
        executable: true,
        confidence: 0.9,
        fallbackSuggestions: []
      };
    }

    return {
      executable: true, // 仍可尝试执行，但有风险
      confidence: 0.3,
      fallbackSuggestions: [
        '原始节点未找到，将尝试智能匹配',
        '建议检查页面是否正确',
        '考虑更新步骤的XML快照'
      ]
    };
  }
}