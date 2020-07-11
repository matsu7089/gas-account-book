const ss = SpreadsheetApp.getActive()
const authToken = PropertiesService.getScriptProperties().getProperty('authToken') || ''

/**
 * レスポンスを作成して返します
 * @param {*} content
 * @returns {TextOutput}
 */
function response (content) {
  const res = ContentService.createTextOutput()
  res.setMimeType(ContentService.MimeType.JSON)
  res.setContent(JSON.stringify(content))
  return res
}

/**
 * アプリにPOSTリクエストが送信されたとき実行されます
 * @param {Event} e
 * @returns {TextOutput}
 */
function doPost (e) {
  let contents
  try {
    contents = JSON.parse(e.postData.contents)
  } catch (e) {
    log('warn', '[doPost] JSONのパースに失敗しました')
    return response({ error: 'JSONの形式が正しくありません' })
  }

  if (contents.authToken !== authToken) {
    log('warn', '[doPost] 認証に失敗しました')
    return response({ error: '認証に失敗しました' })
  }

  const { method = '', params = {} } = contents
  log('info', `[doPost] "${method}" リクエストを受け取りました`)

  let result
  try {
    switch (method) {
      case 'POST':
        result = onPost(params)
        break
      case 'GET':
        result = onGet(params)
        break
      case 'PUT':
        result = onPut(params)
        break
      case 'DELETE':
        result = onDelete(params)
        break
      default:
        result = { error: 'methodを指定してください' }
    }
  } catch (e) {
    log('error', '[doPost] ' + e)
    result = { error: e }
  }

  return response(result)
}

/** --- API --- */

/**
 * 指定年月のデータ一覧を取得します
 * @param {Object} params
 * @param {String} params.yearMonth 年月
 * @returns {Object[]} 家計簿データ
 */
function onGet ({ yearMonth }) {
  const ymReg = /^[0-9]{4}-(0[1-9]|1[0-2])$/
  
  if (!ymReg.test(yearMonth)) {
    return {
      error: '正しい形式で入力してください'
    }
  }
  
  const sheet = ss.getSheetByName(yearMonth)
  const lastRow = sheet ? sheet.getLastRow() : 0

  if (lastRow < 7) {
    return []
  }

  const list = sheet.getRange('A7:H' + lastRow).getValues().map(row => {
    const [id, date, title, category, tags, income, outgo, memo] = row
    return {
      id,
      date,
      title,
      category,
      tags,
      income: (income === '') ? null : income,
      outgo: (outgo === '') ? null : outgo,
      memo
    }
  })

  return list
}

/**
 * データを追加します
 * @param {Object} params
 * @param {Object} params.item 家計簿データ
 * @returns {Object} 追加した家計簿データ
 */
function onPost ({ item }) {
  if (!isValid(item)) {
    return {
      error: '正しい形式で入力してください'
    }
  }
  const { date, title, category, tags, income, outgo, memo } = item
  
  const yearMonth = date.slice(0, 7)
  const sheet = ss.getSheetByName(yearMonth) || insertTemplate(yearMonth)

  const id = Utilities.getUuid().slice(0, 8)
  const row = ["'" + id, "'" + date, "'" + title, "'" + category, "'" + tags, income, outgo, "'" + memo]
  sheet.appendRow(row)

  log('info', `[onPost] データを追加しました シート名: ${yearMonth} id: ${id}`)

  return { id, date, title, category, tags, income, outgo, memo }
}

/**
 * 指定年月&idのデータを削除します
 * @param {Object} params
 * @param {String} params.yearMonth 年月
 * @param {String} params.id id
 * @returns {Object} メッセージ
 */
function onDelete ({ yearMonth, id }) {
  const ymReg = /^[0-9]{4}-(0[1-9]|1[0-2])$/
  const sheet = ss.getSheetByName(yearMonth)

  if (!ymReg.test(yearMonth) || sheet === null) {
    return {
      error: '指定のシートは存在しません'
    }
  }

  const lastRow = sheet.getLastRow()
  const index = sheet.getRange('A7:A' + lastRow).getValues().flat().findIndex(v => v === id)

  if (index === -1) {
    return {
      error: '指定のデータは存在しません'
    }
  }

  sheet.deleteRow(index + 7)
  log('info', `[onDelete] データを削除しました シート名: ${yearMonth} id: ${id}`)

  return {
    message: '削除完了しました'
  }
}

/**
 * 指定データを更新します
 * @param {Object} params
 * @param {String} params.beforeYM 更新前の年月
 * @param {Object} params.item 家計簿データ
 * @returns {Object} 更新後の家計簿データ
 */
function onPut ({ beforeYM, item }) {
  const ymReg = /^[0-9]{4}-(0[1-9]|1[0-2])$/
  if (!ymReg.test(beforeYM) || !isValid(item)) {
    return {
      error: '正しい形式で入力してください'
    }
  }

  // 更新前と後で年月が違う場合、データ削除と追加を実行
  const yearMonth = item.date.slice(0, 7)
  if (beforeYM !== yearMonth) {
    onDelete({ yearMonth: beforeYM, id: item.id })
    return onPost({ item })
  }

  const sheet = ss.getSheetByName(yearMonth)
  if (sheet === null) {
    return {
      error: '指定のシートは存在しません'
    }
  }

  const id = item.id
  const lastRow = sheet.getLastRow()
  const index = sheet.getRange('A7:A' + lastRow).getValues().flat().findIndex(v => v === id)

  if (index === -1) {
    return {
      error: '指定のデータは存在しません'
    }
  }

  const row = index + 7
  const { date, title, category, tags, income, outgo, memo } = item

  const values = [["'" + date, "'" + title, "'" + category, "'" + tags, income, outgo, "'" + memo]]
  sheet.getRange(`B${row}:H${row}`).setValues(values)

  log('info', `[onPut] データを更新しました シート名: ${yearMonth} id: ${id}`)

  return { id, date, title, category, tags, income, outgo, memo }
}

/** --- common --- */

/**
 * 指定年月のテンプレートシートを作成します
 * @param {String} yearMonth
 * @returns {Sheet} sheet
 */
function insertTemplate (yearMonth) {
  const { SOLID_MEDIUM, DOUBLE } = SpreadsheetApp.BorderStyle

  const sheet = ss.insertSheet(yearMonth, 0)
  const [year, month] = yearMonth.split('-')

  // 収支確認エリア
  sheet.getRange('A1:B1')
    .merge()
    .setValue(`${year}年 ${parseInt(month)}月`)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBorder(null, null, true, null, null, null, 'black', SOLID_MEDIUM)

  sheet.getRange('A2:A4')
    .setValues([['収入：'], ['支出：'], ['収支差：']])
    .setFontWeight('bold')
    .setHorizontalAlignment('right')

  sheet.getRange('B2:B4')
    .setFormulas([['=SUM(F7:F)'], ['=SUM(G7:G)'], ['=B2-B3']])
    .setNumberFormat('#,##0')

  sheet.getRange('A4:B4')
    .setBorder(true, null, null, null, null, null, 'black', DOUBLE)

  // テーブルヘッダー
  sheet.getRange('A6:H6')
    .setValues([['id', '日付', 'タイトル', 'カテゴリ', 'タグ', '収入', '支出', 'メモ']])
    .setFontWeight('bold')
    .setBorder(null, null, true, null, null, null, 'black', SOLID_MEDIUM)

  sheet.getRange('F7:G')
    .setNumberFormat('#,##0')

  // カテゴリ別支出
  sheet.getRange('J1')
    .setFormula('=QUERY(B7:H, "select D, sum(G), sum(G) / "&B3&"  where G > 0 group by D order by sum(G) desc label D \'カテゴリ\', sum(G) \'支出\'")')

  sheet.getRange('J1:L1')
    .setFontWeight('bold')
    .setBorder(null, null, true, null, null, null, 'black', SOLID_MEDIUM)

  sheet.getRange('L1')
    .setFontColor('white')

  sheet.getRange('K2:K')
    .setNumberFormat('#,##0')

  sheet.getRange('L2:L')
    .setNumberFormat('0.0%')

  sheet.setColumnWidth(9, 21)

  log('info', '[insertTemplate] シートを作成しました シート名: ' + yearMonth)

  return sheet
}

/**
 * データが正しい形式か検証します
 * @param {Object} item
 * @returns {Boolean} isValid
 */
function isValid (item = {}) {
  const strKeys = ['date', 'title', 'category', 'tags', 'memo']
  const keys = [...strKeys, 'income', 'outgo']

  // すべてのキーが存在するか
  for (const key of keys) {
    if (item[key] === undefined) return false
  }

  // 収支以外が文字列であるか
  for (const key of strKeys) {
    if (typeof item[key] !== 'string') return false
  }

  // 日付が正しい形式であるか
  const dateReg = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/
  if (!dateReg.test(item.date)) return false

  // 収支のどちらかが入力されているか
  const { income: i, outgo: o } = item
  if ((i === null && o === null) || (i !== null && o !== null)) return false

  // 入力された収支が数字であるか
  if (i !== null && typeof i !== 'number') return false
  if (o !== null && typeof o !== 'number') return false

  return true
}

const logMaxRow = 101
const logSheet = ss.getSheetByName('log')

/**
 * ログをシートに記録します
 * @param {String} level 
 * @param {String} message 
 */
function log (level, message) {
  logSheet.appendRow([new Date(), level.toUpperCase(), message])

  if (logMaxRow < logSheet.getLastRow()) {
    logSheet.deleteRow(2)
  }
}