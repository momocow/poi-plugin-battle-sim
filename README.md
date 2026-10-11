# poi-plugin-battle-sim

一個 [poi](https://github.com/poooi/poi) 插件，用來估算艦隊在某張地圖上的表現。它先用 [compass](https://x-20a.github.io/compass/) 預測艦隊可能走的路線，再用 [kancolle-fleet-optimizer](https://github.com/momocow/kancolle-fleet-optimizer) 對每條能抵達 BOSS 的路線進行蒙地卡羅戰鬥模擬。

## 使用方式

1. 選擇艦隊（第 1–4 艦隊）與一般海域地圖（1–7 海域）。若該地圖有可自選的分歧或階段，也一併選擇。
2. 選擇模擬次數：快速（500）、一般（2000）、精確（10000）或自訂。
3. 按下 **Simulate**，或直接編輯艦隊（見[自動執行](#自動執行)）。

每次執行會擷取艦隊快照、預測路線，並模擬每條能抵達 BOSS 的路線。摘要會顯示每次出擊取得 S 勝、A 勝以上、B 勝以上的機率，以及抵達 BOSS 的機率與 BOSS 擊沉率，全部依路線機率加權。下方每條路線各有一張卡片，顯示該路線的機率、經過的節點與結果。執行後若更改了輸入，結果會變暗，直到再次執行為止。

面板文字支援英文、日文與繁體中文。艦船、裝備與地圖名稱依照 poi 的語言設定顯示。

### 自動執行

以下任一項變更時，會自動開始執行：

- 選擇的艦隊；
- 所選艦隊中的艦船（加入、移除、移動、交換或改造）；
- 這些艦船上的裝備（裝上、卸下、移動或改修）；
- 選擇的地圖；
- 分歧或階段的選擇；
- 模擬次數。

只有在艦隊中每艘艦船的主裝備欄都已裝滿時才會自動執行。補強增設欄不計入，艦隊也不必滿編。HP、士氣、等級與熟練度的變化不會觸發執行，因此出擊歸來也不會。變更停止片刻後才會開始執行，所以輸入自訂模擬次數時只會執行一次。若執行途中艦隊有變動，該次執行會被取消並重新開始。可用 **Simulate** 旁的 **Auto** 開關關閉此功能，設定會被記住。

### 自動切換

進入改裝畫面，或在遊戲中變更任一艦隊的艦船或裝備時，poi 會自動切換到本插件的分頁，讓自動執行的結果出現在眼前。可在 poi 的插件設定中，取消勾選本插件的「啟用自動切換」來關閉此功能；poi 的全域自動切換設定也同樣適用。

### 限制

- 尚未支援聯合艦隊（見 `openspec/changes/add-combined-fleet-support`）。
- 不提供活動海域。
- 內附的 optimizer 執行檔目前僅針對 Apple silicon 的 macOS（`darwin-arm64`）建置。
- 路線預測需要能連線到 compass。第一次在某張地圖上執行時，也會下載該地圖的敵方資料。

## 開發

```sh
npm install
npm run typecheck
npm test            # vitest
```

**使用本機建置的 optimizer。** 在 poi 中本插件的設定頁面設定 optimizer 執行檔路徑，必要時也設定資料路徑。也可以在 shell 中設定 `BATTLE_SIM_OPTIMIZER_BIN` 與 `BATTLE_SIM_OPTIMIZER_DATA` 後啟動 poi。設定頁面的優先順序高於環境變數，且執行檔與資料路徑一定來自同一個來源。

**測試資料。** `test/fixtures/store.json` 是 poi store 的精簡副本。若要從已安裝 `poi-plugin-nanodesu-mcp` 並正在執行的 poi 更新它，請執行 `node scripts/capture-store.mjs [port]`。錄製的 optimizer 執行結果放在 `test/fixtures/optimizer`。

**Optimizer 發行版本。** `optimizer.json` 固定了 optimizer 的版本，以及每個壓縮檔與執行檔的 SHA-256。`npm run fetch-optimizer` 會用 `gh` 下載該版本並對照這些雜湊值檢查。這需要 optimizer repo 的存取權限，且也會在 `prepublishOnly` 時執行。各平台執行檔套件及其發布順序請見 [`platforms/README.md`](platforms/README.md)。

**Commit 風格。** Commit 訊息採用 [gitmoji](https://gitmoji.dev/)：標題以一個 gitmoji 開頭，後面接一句英文的祈使句，例如 `✨ Simulate automatically`、`💄 Keep route cards the same size`、`📝 Add a README`。

### 目錄結構

| 路徑 | 內容 |
| --- | --- |
| `index.ts` | 插件進入點：面板與設定頁面 |
| `src/fleet/` | 將 poi 的 store 讀成凍結的艦隊快照；deck-builder 與 TOML 轉換器 |
| `src/routes/` | 透過隱藏 webview 中的 compass 預測路線；分歧選擇；BOSS 節點 |
| `src/optimizer/` | 尋找、執行與檢查 optimizer；預先抓取 kcnav 資料；合併結果 |
| `src/fleet-view/` | 艦隊顯示（艦船、HP、士氣、裝備、摘要列） |
| `src/ui/` | 面板：控制項、執行狀態與執行器、摘要、路線卡片、結果頁尾 |
| `i18n/` | en-US、ja-JP 與 zh-TW 字串 |
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

目前的能力有 `battle-simulation`、`fleet-capture`、`route-prediction` 與 `simulator-panel`。每份規格是一系列需求，每項需求包含以 **WHEN** / **THEN** 撰寫的 `#### Scenario:` 區塊。

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
