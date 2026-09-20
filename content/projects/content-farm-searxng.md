---
title: "ContentFarm4SearXNG - 内容农场过滤器"
description: "为SearXNG搜索引擎提供内容农场hostname规则，提升搜索结果质量"
date: "2025-07-20"
type: "personal"
tags: ["Python", "SearXNG", "Content Farm", "Search Engine", "Filter", "uBlock Origin"]
link: "https://github.com/hezhijie0327/ContentFarm4SearXNG"
---

# ContentFarm4SearXNG - 内容农场过滤器

一个专为SearXNG元搜索引擎设计的内容农场过滤工具，通过识别和过滤低质量内容农场网站来提升搜索结果质量。

## 🎯 项目概述

ContentFarm4SearXNG致力于解决搜索引擎中的内容农场问题，为用户提供更高质量、更可靠的搜索结果。

### 核心价值
- 🔍 **提升搜索质量** - 过滤低质量内容农场
- 🛡️ **保护用户体验** - 减少误导性和低价值信息
- 📊 **数据驱动** - 基于多源数据分析识别内容农场
- 🔄 **持续维护** - 定期更新过滤规则
- 🌐 **多平台支持** - 兼容SearXNG和uBlock Origin

## 🏗️ 技术架构

### 识别算法
```python
import re
import requests
from typing import List, Dict, Set

class ContentFarmDetector:
    def __init__(self):
        self.content_farm_patterns = [
            # 基于URL模式的识别
            r'.*\.info$',
            r'.*\.top$',
            r'.*-blog\..*',
            r'.*guide.*',

            # 基于内容特征的识别
            r'.*(how|guide|tutorial).*step.*',
            r'.*(best|top).*(\d+).*',
            r'.*(review|rating).*',
        ]

        self.low_quality_indicators = [
            'clickbait',
            'sponsored content',
            'advertisement',
            'affiliate links',
            'pop-up ads',
        ]

    def analyze_domain(self, domain: str) -> Dict:
        """分析域名是否为内容农场"""
        result = {
            'domain': domain,
            'is_content_farm': False,
            'confidence': 0.0,
            'reasons': []
        }

        # 模式匹配检测
        for pattern in self.content_farm_patterns:
            if re.match(pattern, domain, re.IGNORECASE):
                result['is_content_farm'] = True
                result['confidence'] += 0.3
                result['reasons'].append(f'Match pattern: {pattern}')

        # 内容质量分析
        try:
            response = requests.get(f'https://{domain}', timeout=10)
            content = response.text.lower()

            for indicator in self.low_quality_indicators:
                if indicator in content:
                    result['confidence'] += 0.2
                    result['reasons'].append(f'Content indicator: {indicator}')

        except Exception as e:
            result['reasons'].append(f'Analysis failed: {str(e)}')

        result['is_content_farm'] = result['confidence'] > 0.5
        return result

    def generate_filter_rules(self, domains: List[str]) -> str:
        """生成过滤规则文件"""
        rules = []
        rules.append("# Content Farm Filter Rules for SearXNG")
        rules.append("# Generated on: " + str(datetime.now()))
        rules.append("")

        for domain in domains:
            analysis = self.analyze_domain(domain)
            if analysis['is_content_farm']:
                rules.append(f"# {domain} - {', '.join(analysis['reasons'])}")
                rules.append(f"! {domain}")
                rules.append("")

        return '\n'.join(rules)

# 使用示例
detector = ContentFarmDetector()
test_domains = ['example.com', 'blog.example.top', 'guide-site.info']

for domain in test_domains:
    result = detector.analyze_domain(domain)
    print(f"Domain: {result['domain']}")
    print(f"Content Farm: {result['is_content_farm']}")
    print(f"Confidence: {result['confidence']:.2f}")
    print(f"Reasons: {', '.join(result['reasons'])}")
    print("-" * 50)
```

### 多格式输出
```python
class FilterGenerator:
    def __init__(self, detector: ContentFarmDetector):
        self.detector = detector

    def generate_searxng_rules(self, domains: List[str]) -> str:
        """生成SearXNG格式规则"""
        rules = []
        rules.append("# SearXNG hostname rules")
        rules.append("# Format: !domain.com")
        rules.append("")

        for domain in domains:
            if self.detector.analyze_domain(domain)['is_content_farm']:
                rules.append(f"!{domain}")

        return '\n'.join(rules)

    def generate_ublock_rules(self, domains: List[str]) -> str:
        """生成uBlock Origin格式规则"""
        rules = []
        rules.append("# uBlock Origin filter rules")
        rules.append("# Format: ||domain.com^")
        rules.append("")

        for domain in domains:
            if self.detector.analyze_domain(domain)['is_content_farm']:
                rules.append(f"||{domain}^")

        return '\n'.join(rules)

    def generate_hosts_file(self, domains: List[str]) -> str:
        """生成hosts文件格式"""
        rules = []
        rules.append("# Hosts file for blocking content farms")
        rules.append("# Format: 127.0.0.1 domain.com")
        rules.append("")

        for domain in domains:
            if self.detector.analyze_domain(domain)['is_content_farm']:
                rules.append(f"127.0.0.1 {domain}")

        return '\n'.join(rules)
```

## 🎨 功能特性

### 1. 智能识别算法
- **URL模式匹配** - 基于域名和URL结构识别
- **内容分析** - 分析页面内容特征
- **机器学习** - 使用分类算法提升识别精度
- **社区反馈** - 结合用户举报和验证

### 2. 多维度评估
```python
class DomainEvaluator:
    def __init__(self):
        self.quality_factors = {
            'content_length': 0.1,
            'originality_score': 0.3,
            'ad_density': 0.2,
            'source_citations': 0.2,
            'user_engagement': 0.2,
        }

    def evaluate_quality(self, domain: str) -> Dict:
        """综合评估域名内容质量"""
        scores = {}

        # 内容长度评估
        scores['content_length'] = self.analyze_content_length(domain)

        # 原创性评分
        scores['originality_score'] = self.check_originality(domain)

        # 广告密度分析
        scores['ad_density'] = self.analyze_ad_density(domain)

        # 引用来源检查
        scores['source_citations'] = self.check_citations(domain)

        # 用户参与度
        scores['user_engagement'] = self.analyze_engagement(domain)

        # 计算综合评分
        total_score = sum(
            score * self.quality_factors[factor]
            for factor, score in scores.items()
        )

        return {
            'domain': domain,
            'total_score': total_score,
            'detailed_scores': scores,
            'is_content_farm': total_score < 0.4
        }
```

### 3. 自动化更新机制
```python
import schedule
import time

def update_filter_rules():
    """定时更新过滤规则"""
    print("Starting filter rule update...")

    # 获取新的域名列表
    new_domains = fetch_candidate_domains()

    # 分析和生成规则
    detector = ContentFarmDetector()
    generator = FilterGenerator(detector)

    # 生成多种格式
    searxng_rules = generator.generate_searxng_rules(new_domains)
    ublock_rules = generator.generate_ublock_rules(new_domains)
    hosts_rules = generator.generate_hosts_file(new_domains)

    # 保存到文件
    with open('searxng_hostname.txt', 'w') as f:
        f.write(searxng_rules)

    with open('ublock_filter.txt', 'w') as f:
        f.write(ublock_rules)

    with open('hosts_block.txt', 'w') as f:
        f.write(hosts_rules)

    print("Filter rules updated successfully!")

# 设置定时任务
schedule.every().day.at("02:00").do(update_filter_rules)

while True:
    schedule.run_pending()
    time.sleep(3600)  # 每小时检查一次
```

## 🔧 集成方案

### 1. SearXNG集成
```python
# searxng settings.py 配置
hostname_rules = {
    'replacement': None,
    'rules_file': '/path/to/searxng_hostname.txt',
    'name': 'Content Farm Blocker',
    'description': 'Block content farm websites'
}

# 添加到搜索引擎配置
engines = [
    {
        'name': 'google',
        'engine': 'google',
        'hostname_replace': hostname_rules,
        # ... 其他配置
    }
]
```

### 2. uBlock Origin集成
```javascript
// 自定义过滤器
const contentFarmFilter = {
    name: 'Content Farm Blocker',
    list: [
        '||example-content-farm.com^',
        '||low-quality-site.info^',
        '||clickbait-blog.top^'
    ],
    enabled: true
};

// 添加到过滤器列表
function addCustomFilter() {
    const filters = [];
    filters.push(contentFarmFilter);
    return filters;
}
```

## 📊 数据统计

### 过滤效果分析
```python
def generate_statistics():
    """生成过滤统计报告"""
    stats = {
        'total_domains_analyzed': 0,
        'content_farms_blocked': 0,
        'false_positives': 0,
        'accuracy_rate': 0.0,
        'coverage_rate': 0.0
    }

    # 读取过滤日志
    with open('filter_log.txt', 'r') as f:
        logs = f.readlines()

    for log in logs:
        if 'ANALYZED' in log:
            stats['total_domains_analyzed'] += 1
        elif 'BLOCKED' in log:
            stats['content_farms_blocked'] += 1
        elif 'FALSE_POSITIVE' in log:
            stats['false_positives'] += 1

    # 计算统计指标
    if stats['total_domains_analyzed'] > 0:
        stats['coverage_rate'] = stats['content_farms_blocked'] / stats['total_domains_analyzed']
        stats['accuracy_rate'] = 1 - (stats['false_positives'] / stats['content_farms_blocked'])

    return stats
```

## 🚀 部署和维护

### 自动化部署
```yaml
# GitHub Actions工作流
name: Update Content Farm Filter

on:
  schedule:
    - cron: '0 2 * * *'  # 每日更新
  workflow_dispatch:

jobs:
  update-filter:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'

    - name: Install dependencies
      run: |
        pip install requests beautifulsoup4 schedule

    - name: Update filter rules
      run: |
        python update_filters.py

    - name: Commit and push
      run: |
        git config --local user.email "action@github.com"
        git config --local user.name "GitHub Action"
        git add .
        git commit -m "Auto update content farm filters - $(date)"
        git push
```

## 🔮 项目价值

### 技术价值
- **搜索质量提升** - 有效过滤低质量内容
- **用户体验改善** - 减少信息噪音和误导内容
- **开源贡献** - 为搜索引擎生态提供价值
- **工具集成** - 支持多种平台和工具

### 社会价值
- **信息净化** - 提升网络信息环境质量
- **教育价值** - 帮助用户识别和避免内容农场
- **效率提升** - 节省用户筛选信息的时间
- **知识保护** - 保护原创和高质量内容的可见性

---

**项目链接**: [GitHub Repository](https://github.com/hezhijie0327/ContentFarm4SearXNG)

**技术栈**: Python | SearXNG | Content Analysis | Machine Learning | Web Scraping