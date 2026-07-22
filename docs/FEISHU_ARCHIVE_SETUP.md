# 飞书文书生成与归档配置

## 1. 必需权限

在飞书开放平台为企业自建应用开通：

- 多维表格查看、编辑和管理权限；
- 云空间文件上传、下载和管理权限；
- 用户身份基础信息；
- `offline_access`。

应用还必须被添加为目标 Base 的文档应用，并对归档根文件夹具有编辑权限。

## 2. 数据表要求

启动服务后访问 `/api/feishu/schema`。返回的 `compatible` 必须为 `true`。

系统会检查：

- 会议表；
- 人员表；
- 议案表；
- 文书表；
- 文书生成任务表。

人员表必须有文本字段“姓名文本”。飞书用户字段“姓名”只能关联企业内用户，不能稳定保存外部董事、自然人股东和法人股东代表。

### 文书生成任务表推荐字段

| 字段 | 类型 |
|---|---|
| 任务ID | 文本/主字段 |
| 任务键 | 文本 |
| 关联会议 | 关联会议表 |
| 状态 | 单选 |
| 进度 | 数字 |
| 重试次数 | 数字 |
| 任务消息 | 多行文本 |
| 错误信息 | 多行文本 |
| 操作者 | 文本 |
| 文件夹链接 | URL |
| 更新时间 | 日期时间 |

### 文书表推荐字段

| 字段 | 类型 |
|---|---|
| 文书名称 | 文本/主字段 |
| 文书类型 | 单选 |
| 关联会议 | 关联会议表 |
| 文书附件 | 附件 |
| 文件夹链接 | URL |
| 模板版本 | 文本 |
| 数据快照哈希 | 文本 |
| 生成任务ID | 文本 |
| 生成状态 | 单选 |
| 生成时间 | 日期时间 |

## 3. 环境变量

复制 `.env.example` 并配置：

```env
FEISHU_APP_ID=
FEISHU_APP_SECRET=
FEISHU_BASE_APP_TOKEN=
FEISHU_ARCHIVE_FOLDER_TOKEN=
FEISHU_TENANT_DOMAIN=example.feishu.cn
FEISHU_DOCUMENT_JOB_TABLE_ID=

FEISHU_OAUTH_REDIRECT_URI=https://your-domain.example/api/auth/feishu/callback
FEISHU_OAUTH_SUCCESS_REDIRECT=https://your-domain.example/
FEISHU_OAUTH_SCOPES=offline_access auth:user.id:read
SESSION_SECRET=
TOKEN_ENCRYPTION_KEY=
```

`SESSION_SECRET` 和 `TOKEN_ENCRYPTION_KEY` 应分别使用独立的高强度随机值。

## 4. 运行验证

```text
GET  /api/health
GET  /api/feishu/status
GET  /api/feishu/schema
GET  /api/auth/session
```

在文书中心选择一场飞书会议，点击“生成并下载全套”。页面应依次显示：

1. 读取会议数据；
2. 生成 Word 和 ZIP；
3. 创建飞书归档文件夹；
4. 逐份上传文书；
5. 回写文书表和会议表；
6. 显示“打开飞书文件夹”和“下载 ZIP”。

相同会议数据和模板重复提交时，系统会返回原任务。失败任务可从原进度重试，不会重新创建整套文件夹。
