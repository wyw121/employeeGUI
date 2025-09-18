#!/usr/bin/env node

/**
 * 基于真实XML数据的智能元素分析器
 * 专门用于分析小红书等Android应用的UI元素
 * 
 * 使用方法：
 * node real_xml_analyzer.js [XML文件路径] [查找文本]
 */

import fs from 'fs';
import { DOMParser } from 'xmldom';

class RealXMLAnalyzer {
    constructor() {
        this.screenHeight = 1920;
        this.screenWidth = 1080;
        
        // 基于真实数据的小红书配置
        this.xiaohongshuConfig = {
            packageName: 'com.xingin.xhs',
            navigation: {
                '首页': {
                    expectedBounds: { x: [0, 216], y: [1785, 1920] },
                    confidence: 0.95,
                    description: '🏠 小红书首页 - 浏览推荐内容和关注动态',
                    action: '点击返回主页面'
                },
                '市集': {
                    expectedBounds: { x: [216, 432], y: [1785, 1920] },
                    confidence: 0.9,
                    description: '🛍️ 小红书市集 - 购买商品和浏览店铺',
                    action: '点击进入购物页面'
                },
                '发布': {
                    expectedBounds: { x: [432, 648], y: [1785, 1920] },
                    confidence: 0.85,
                    description: '➕ 内容发布 - 创建新的笔记或视频',
                    action: '点击发布新内容'
                },
                '消息': {
                    expectedBounds: { x: [648, 864], y: [1785, 1920] },
                    confidence: 0.9,
                    description: '💬 消息中心 - 查看私信、评论和通知',
                    action: '点击查看消息'
                },
                '我': {
                    expectedBounds: { x: [864, 1080], y: [1785, 1920] },
                    confidence: 0.95,
                    description: '👤 个人中心 - 账户管理和个人设置',
                    action: '点击进入个人页面'
                }
            },
            topElements: {
                '搜索': {
                    expectedBounds: { x: [945, 1053], y: [84, 192] },
                    confidence: 0.9,
                    description: '🔍 搜索功能 - 查找用户、内容或商品',
                    action: '点击搜索框开始搜索'
                }
            }
        };
    }

    /**
     * 分析XML文件中的特定元素
     */
    analyzeXMLFile(xmlPath, searchText = null) {
        console.log(`🔍 分析XML文件: ${xmlPath}\n`);
        
        try {
            const xmlContent = fs.readFileSync(xmlPath, 'utf8');
            const parser = new DOMParser();
            const doc = parser.parseFromString(xmlContent, 'text/xml');
            
            console.log('📄 XML文件解析成功\n');
            
            if (searchText) {
                return this.findSpecificElement(doc, searchText);
            } else {
                return this.analyzeAllKeyElements(doc);
            }
        } catch (error) {
            console.error('❌ XML解析错误:', error.message);
            return null;
        }
    }

    /**
     * 查找特定文本的元素
     */
    findSpecificElement(doc, searchText) {
        console.log(`🎯 正在查找包含 "${searchText}" 的元素...\n`);
        
        const allElements = doc.getElementsByTagName('node');
        const candidates = [];
        
        for (let i = 0; i < allElements.length; i++) {
            const element = allElements[i];
            const text = element.getAttribute('text') || '';
            const contentDesc = element.getAttribute('content-desc') || '';
            
            if (text.includes(searchText) || contentDesc.includes(searchText)) {
                const analysis = this.analyzeElement(element, i);
                candidates.push(analysis);
            }
        }
        
        console.log(`找到 ${candidates.length} 个匹配元素:\n`);
        
        candidates.forEach((candidate, idx) => {
            console.log(`📱 候选元素 ${idx + 1}:`);
            this.printElementAnalysis(candidate);
            console.log('');
        });
        
        return candidates;
    }

    /**
     * 分析所有关键UI元素
     */
    analyzeAllKeyElements(doc) {
        console.log('🔍 分析所有关键UI元素...\n');
        
        const results = {
            navigation: [],
            search: [],
            content: [],
            other: []
        };
        
        const allElements = doc.getElementsByTagName('node');
        
        for (let i = 0; i < allElements.length; i++) {
            const element = allElements[i];
            const analysis = this.analyzeElement(element, i);
            
            if (analysis.category === 'navigation') {
                results.navigation.push(analysis);
            } else if (analysis.category === 'search') {
                results.search.push(analysis);
            } else if (analysis.category === 'content') {
                results.content.push(analysis);
            } else if (analysis.isInteresting) {
                results.other.push(analysis);
            }
        }
        
        this.printCategorizedResults(results);
        return results;
    }

    /**
     * 分析单个元素
     */
    analyzeElement(element, index) {
        const bounds = this.parseBounds(element.getAttribute('bounds'));
        const text = element.getAttribute('text') || '';
        const contentDesc = element.getAttribute('content-desc') || '';
        const className = element.getAttribute('class') || '';
        const packageName = element.getAttribute('package') || '';
        const clickable = element.getAttribute('clickable') === 'true';
        const selected = element.getAttribute('selected') === 'true';
        
        const analysis = {
            index,
            text,
            contentDesc,
            className,
            packageName,
            bounds,
            clickable,
            selected,
            position: bounds ? this.analyzePosition(bounds) : null,
            category: this.categorizeElement(text, contentDesc, bounds, className),
            confidence: this.calculateConfidence(text, contentDesc, bounds, className, selected, packageName),
            functionality: this.determineFunctionality(text, contentDesc, bounds),
            description: this.generateDescription(text, contentDesc, bounds),
            actionSuggestion: this.suggestAction(text, contentDesc, bounds, clickable),
            isInteresting: this.isElementInteresting(text, contentDesc, clickable, className)
        };
        
        return analysis;
    }

    parseBounds(boundsStr) {
        if (!boundsStr) return null;
        const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
        if (!match) return null;
        
        return {
            left: parseInt(match[1]),
            top: parseInt(match[2]),
            right: parseInt(match[3]),
            bottom: parseInt(match[4]),
            width: parseInt(match[3]) - parseInt(match[1]),
            height: parseInt(match[4]) - parseInt(match[2])
        };
    }

    analyzePosition(bounds) {
        const centerY = bounds.top + bounds.height / 2;
        const centerX = bounds.left + bounds.width / 2;
        
        let region = 'center';
        if (centerY < this.screenHeight * 0.3) {
            region = 'top';
        } else if (centerY > this.screenHeight * 0.8) {
            region = 'bottom';
        }
        
        let horizontal = 'center';
        if (centerX < this.screenWidth * 0.3) {
            horizontal = 'left';
        } else if (centerX > this.screenWidth * 0.7) {
            horizontal = 'right';
        }
        
        return {
            region,
            horizontal,
            centerY,
            centerX,
            isBottomNavigation: centerY > this.screenHeight * 0.85,
            isTopBar: centerY < this.screenHeight * 0.15
        };
    }

    categorizeElement(text, contentDesc, bounds, className) {
        const allText = (text + ' ' + contentDesc).toLowerCase();
        
        // 导航元素
        const navKeywords = ['首页', '市集', '发布', '消息', '我', '关注', '发现', '视频'];
        if (navKeywords.some(keyword => allText.includes(keyword.toLowerCase()))) {
            if (bounds && bounds.top > 1700) {
                return 'navigation';
            }
        }
        
        // 搜索元素
        if (allText.includes('搜索') || allText.includes('search')) {
            return 'search';
        }
        
        // 内容元素
        if (allText.includes('笔记') || allText.includes('视频') || contentDesc.includes('赞')) {
            return 'content';
        }
        
        return 'other';
    }

    calculateConfidence(text, contentDesc, bounds, className, selected, packageName) {
        let confidence = 0;
        
        // 小红书特定匹配
        if (packageName === 'com.xingin.xhs') {
            confidence += 0.2;
            
            // 导航栏精确匹配
            const navConfig = this.xiaohongshuConfig.navigation;
            for (const [navText, config] of Object.entries(navConfig)) {
                if ((text === navText || contentDesc === navText) && bounds) {
                    const expectedBounds = config.expectedBounds;
                    if (bounds.left >= expectedBounds.x[0] && bounds.right <= expectedBounds.x[1] &&
                        bounds.top >= expectedBounds.y[0] && bounds.bottom <= expectedBounds.y[1]) {
                        confidence += 0.6; // 高置信度匹配
                        break;
                    }
                }
            }
        }
        
        // 文本精确匹配
        if (text.length === 1 && ['首页', '市集', '消息', '我'].includes(text)) {
            confidence += 0.3;
        }
        
        // 位置权重
        if (bounds) {
            const position = this.analyzePosition(bounds);
            if (position.isBottomNavigation && text.length <= 2) {
                confidence += 0.2;
            }
        }
        
        return Math.min(confidence, 1.0);
    }

    determineFunctionality(text, contentDesc, bounds) {
        if (text === '我' || contentDesc === '我') return 'profile';
        if (text === '首页') return 'home';
        if (text === '消息' || contentDesc.includes('消息')) return 'messages';
        if (text === '市集') return 'shopping';
        if (contentDesc === '发布') return 'create';
        if (contentDesc === '搜索') return 'search';
        return 'unknown';
    }

    generateDescription(text, contentDesc, bounds) {
        const functionality = this.determineFunctionality(text, contentDesc, bounds);
        
        const descriptions = {
            profile: '👤 个人中心页面，包含账户信息、设置和个人内容',
            home: '🏠 应用主页，展示推荐和关注的内容',
            messages: '💬 消息中心，显示通知、私信和互动消息',
            shopping: '🛍️ 购物页面，浏览和购买商品',
            create: '➕ 内容创建，发布新的笔记或视频',
            search: '🔍 搜索功能，查找用户、内容或商品',
            unknown: '❓ 未知功能元素'
        };
        
        return descriptions[functionality] || descriptions.unknown;
    }

    suggestAction(text, contentDesc, bounds, clickable) {
        if (!clickable) return '此元素不可点击';
        
        const functionality = this.determineFunctionality(text, contentDesc, bounds);
        
        const actions = {
            profile: '点击进入个人资料页面',
            home: '点击返回主页面',
            messages: '点击查看消息通知',
            shopping: '点击进入购物页面',
            create: '点击开始创建内容',
            search: '点击开始搜索',
            unknown: '点击查看详细内容'
        };
        
        return actions[functionality] || actions.unknown;
    }

    isElementInteresting(text, contentDesc, clickable, className) {
        // 有意义的文本
        if (text && text.length > 0 && text.length <= 10) return true;
        
        // 有描述的可点击元素
        if (clickable && contentDesc && contentDesc.length > 0) return true;
        
        // 重要的UI组件
        const importantClasses = ['Button', 'TextView', 'EditText'];
        if (importantClasses.some(cls => className.includes(cls))) return true;
        
        return false;
    }

    printElementAnalysis(analysis) {
        console.log(`   📍 位置: [${analysis.bounds?.left},${analysis.bounds?.top}][${analysis.bounds?.right},${analysis.bounds?.bottom}]`);
        console.log(`   📱 文本: "${analysis.text}"`);
        console.log(`   📝 描述: "${analysis.contentDesc}"`);
        console.log(`   🏷️  类名: ${analysis.className}`);
        console.log(`   📦 包名: ${analysis.packageName}`);
        console.log(`   👆 可点击: ${analysis.clickable ? '是' : '否'}`);
        console.log(`   📊 置信度: ${(analysis.confidence * 100).toFixed(1)}%`);
        console.log(`   🎯 功能: ${analysis.functionality}`);
        console.log(`   💡 描述: ${analysis.description}`);
        console.log(`   🎮 建议: ${analysis.actionSuggestion}`);
    }

    printCategorizedResults(results) {
        console.log('📋 分析结果汇总:\n');
        
        if (results.navigation.length > 0) {
            console.log('🧭 导航元素:');
            results.navigation.forEach((nav, idx) => {
                console.log(`   ${idx + 1}. "${nav.text || nav.contentDesc}" - 置信度: ${(nav.confidence * 100).toFixed(1)}%`);
                console.log(`      ${nav.description}`);
                console.log(`      位置: [${nav.bounds?.left},${nav.bounds?.top}][${nav.bounds?.right},${nav.bounds?.bottom}]`);
            });
            console.log('');
        }
        
        if (results.search.length > 0) {
            console.log('🔍 搜索元素:');
            results.search.forEach((search, idx) => {
                console.log(`   ${idx + 1}. "${search.contentDesc}" - 置信度: ${(search.confidence * 100).toFixed(1)}%`);
            });
            console.log('');
        }
        
        if (results.content.length > 0) {
            console.log('📄 内容元素:');
            results.content.slice(0, 5).forEach((content, idx) => {
                console.log(`   ${idx + 1}. "${(content.contentDesc || content.text).substring(0, 30)}..." - 置信度: ${(content.confidence * 100).toFixed(1)}%`);
            });
            console.log('');
        }
    }
}

// 主执行逻辑
function main() {
    const args = process.argv.slice(2);
    const xmlPath = args[0] || 'D:\\rust\\active-projects\\小红书\\employeeGUI\\debug_xml\\ui_dump_emulator-5554_20250918_164711.xml';
    const searchText = args[1];
    
    console.log('🚀 小红书UI元素智能分析器\n');
    console.log('='.repeat(50));
    
    const analyzer = new RealXMLAnalyzer();
    const results = analyzer.analyzeXMLFile(xmlPath, searchText);
    
    if (results) {
        console.log('\n✅ 分析完成！');
        if (searchText) {
            console.log(`💡 建议: 基于分析结果，您可以通过坐标点击或自动化操作与"${searchText}"元素交互。`);
        } else {
            console.log('💡 建议: 可以使用 node real_xml_analyzer.js [XML路径] [搜索文本] 来查找特定元素。');
        }
    }
}

// 运行分析器
main();