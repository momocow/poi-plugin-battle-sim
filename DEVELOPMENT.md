# 開發

```sh
npm install
npm run typecheck
npm test            # vitest
```

**使用本機建置的 optimizer。** 在 poi 中本插件的設定頁面設定 optimizer 執行檔路徑，必要時也設定資料路徑。也可以在 shell 中設定 `BATTLE_SIM_OPTIMIZER_BIN` 與 `BATTLE_SIM_OPTIMIZER_DATA` 後啟動 poi。設定頁面的優先順序高於環境變數，且執行檔與資料路徑一定來自同一個來源。

**測試資料。** `test/fixtures/store.json` 是 poi store 的精簡副本。若要從已安裝 `poi-plugin-nanodesu-mcp` 並正在執行的 poi 更新它，請執行 `node scripts/capture-store.mjs [port]`。錄製的 optimizer 執行結果放在 `test/fixtures/optimizer`。

**Optimizer 發行版本。** `optimizer.json` 固定了 optimizer 的版本，以及每個壓縮檔與執行檔的 SHA-256。`npm run fetch-optimizer` 會用 `gh` 下載該版本並對照這些雜湊值檢查，執行檔放到 `platforms/*/bin/`，資料放到 `fcd/optimizer/`（遊戲資料包的 optimizer 部分）。這需要 optimizer repo 的存取權限，且也會在 `prepublishOnly` 時執行。各平台執行檔套件及其發布順序請見 [`platforms/README.md`](platforms/README.md)。

**遊戲資料包。** `fcd/` 是獨立的 npm 套件 `poi-plugin-battle-sim-data`，有自己的版號，格式與版號規則見 [`fcd/README.md`](fcd/README.md)。更新快照與發布的步驟見 [`fcd/DEVELOPMENT.md`](fcd/DEVELOPMENT.md)。資料格式有不相容的變更時，要先發布資料包，再發布依賴它的插件。尚未發布前插件以 `file:./fcd` 依賴它，發布插件前必須改成版本範圍。

**發行。** `npm run release -- <x.y.z> [--notes <檔案>] [--dry-run]` 會一併調升主套件與各平台套件的版本、檢查並發布各平台套件、更新 lockfile、建立 `🔖 Release <x.y.z>` commit 與 `v<x.y.z>` tag、發布主套件並推送。失敗後可直接重新執行，已完成的步驟會略過。`--dry-run` 只調升版本並以 `npm publish --dry-run` 檢查，不會 commit 或發布。

**Commit 風格。** Commit 訊息採用 [gitmoji](https://gitmoji.dev/)：標題以一個 gitmoji 開頭，後面接一句英文的祈使句，例如 `✨ Simulate automatically`、`💄 Keep route cards the same size`、`📝 Add a README`。

## 目錄結構

| 路徑 | 內容 |
| --- | --- |
| `index.ts` | 插件進入點：面板與設定頁面 |
| `src/fleet/` | 將 poi 的 store 讀成凍結的艦隊快照；deck-builder 與 TOML 轉換器 |
| `src/routes/` | 透過隱藏 webview 中的 compass 預測路線；分歧選擇；BOSS 節點 |
| `src/optimizer/` | 尋找、執行與檢查 optimizer；抓取資料包沒涵蓋的 kcnav 資料；合併結果 |
| `src/gameData/` | 遊戲資料包：讀取與檢查、使用中的版本、檢查與套用更新 |
| `src/fleet-view/` | 艦隊顯示（艦船、HP、士氣、裝備、摘要列） |
| `src/ui/` | 面板：控制項、執行狀態與執行器、摘要、路線卡片、結果頁尾 |
| `i18n/` | en-US、ja-JP 與 zh-TW 字串 |
| `fcd/` | 遊戲資料包 `poi-plugin-battle-sim-data`（經常變動的資料） |
| `openspec/` | 規格與變更提案（見下文） |

## OpenSpec 工作流程

插件的行為記錄在 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 規格中，任何變更在寫程式之前都要先經過提案。需要安裝 `openspec` CLI（`openspec --version`）。

```
openspec/
├── config.yaml            AI 撰寫文件時使用的專案背景
├── specs/<capability>/    目前的行為，每個能力一份規格
│   └── spec.md
└── changes/
    ├── <change>/          提案中或進行中的變更
    └── archive/           已完成的變更，以日期為前綴
```

目前的能力有 `battle-simulation`、`developer-log`、`fleet-capture`、`game-data-package`、`route-prediction` 與 `simulator-panel`。每份規格是一系列需求，每項需求包含以 **WHEN** / **THEN** 撰寫的 `#### Scenario:` 區塊。

### 變更的檔案

一個變更目錄包含：

- `proposal.md`：為什麼需要這項變更，以及它改變了什麼；
- `design.md`：如何實作、做出的決定，以及仍未解決的問題；
- `specs/<capability>/spec.md`：相對於主規格的*差異*，分為 `## ADDED Requirements`、`## MODIFIED Requirements` 與 `## REMOVED Requirements`。修改的需求要完整寫出，而不是寫成 diff；
- `tasks.md`：編號的核取方塊任務，完成後勾選。

### 流程

在 Claude Code 中，每個步驟都是一個 slash 指令（`.claude/commands/opsx/`），各自對應 `.claude/skills/` 中的一個 skill：

1. **探索**（`/opsx:explore`，可選）：思考構想、閱讀程式碼並釐清未決問題。不會寫入任何檔案。
2. **提案**（`/opsx:propose <idea>`）：建立 `openspec/changes/<name>/`，包含提案、差異規格、設計與任務。只做規劃，不改程式碼。
3. **修訂**（`/opsx:update`）：將新的決定納入變更，並讓其中的檔案彼此一致。絕不修改程式碼。
4. **實作**（`/opsx:apply <name>`）：逐項完成 `tasks.md`，完成後勾選。
5. **同步**（`/opsx:sync`，可選）：將變更的差異規格合併到 `openspec/specs/`，但不封存。
6. **封存**（`/opsx:archive <name>`）：所有任務完成後，將差異規格合併到主規格，並把變更移到 `changes/archive/YYYY-MM-DD-<name>/`。

CLI 可以查看目前狀態：`openspec list` 列出進行中的變更，`openspec status --change <name>` 顯示某項變更的進度，`openspec validate <name>` 檢查其格式。

程式碼已經存在的小型變更，也可以直接寫進主規格。`simulator-panel` 中的自動執行需求就是這樣加入的。

### 進行中的變更

- `add-combined-fleet-support`：在擷取、預測、模擬與面板中支援聯合艦隊（1+2）。
- `add-hensei-nikki-integration`：模擬編成日記插件中儲存的艦隊，並將模擬過的艦隊存入編成日記。
- `add-land-base-support`：陸航支援（節點距離來自遊戲資料包）。
- `verify-event-maps-live`：下次活動時以實際資料確認活動海域的讀取（出擊旗標、難度與血條欄位）。
