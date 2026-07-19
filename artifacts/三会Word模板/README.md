# 三会 Word 模板包

本包依据历史三会文件重构，共包含股东会 9 类、董事会 6 类、监事会 6 类模板。

占位符规则：

- 标量字段：`{{表名.字段名}}`
- 日期格式：`{{会议表.时间|日期}}`
- 循环数据：`{{#议案列表}}` 到 `{{/议案列表}}`
- 蓝底蓝字内容均为生成时需要替换的占位符

生成顺序建议：通知及回执 → 议案 → 议程（股东会）→ 签到 → 表决票 →
表决结果统计（股东会）→ 会议记录 → 会议决议。

当前 Base 未包含的字段已在《00-占位符与多维表格字段映射》中标为“建议新增”。

后端填充原则：

1. 标量字段直接替换，例如 `{{会议表.时间|日期}}`。
2. 关联列表先查询多维表格，再复制 Word 模板行并逐行填值；不要把多维表格网址直接嵌入 DOCX。
3. 表决汇总字段由表决记录计算后替换，不在前端重复录入。

伪代码：

```python
def render_doc(meeting_id, template):
    meeting = bitable.get("会议表", meeting_id)
    proposals = bitable.query("议案表", {"关联会议": meeting_id})
    attendees = resolve_links(meeting["参会人员"])
    votes = bitable.query("表决表", {"关联会议": meeting_id})

    doc = replace_scalar_placeholders(template, meeting)
    doc = render_loop(doc, "议案列表", proposals)
    doc = render_loop(doc, "参会人员列表", attendees)
    doc = replace_vote_summary(doc, summarize(votes))
    return doc
```
