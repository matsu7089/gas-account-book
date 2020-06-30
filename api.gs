const ss = SpreadsheetApp.getActive()

function test () {
  onPost({
    item: {
      date: '2020-07-01',
      title: '支出サンプル',
      category: '食費',
      tags: 'タグ1,タグ2',
      income: null,
      outgo: 3000,
      memo: 'メモメモ'  
    }
  })
}

/** --- API --- */

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