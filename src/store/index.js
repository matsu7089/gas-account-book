import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

/** 
 * State
 * Vuexの状態
 */
const state = {
  /** 家計簿データ */
  abData: {},

  /** 設定 */
  settings: {
    appName: 'GAS 家計簿',
    apiUrl: '',
    authToken: '',
    strIncomeItems: '給料, ボーナス, 繰越',
    strOutgoItems: '食費, 趣味, 交通費, 買い物, 交際費, 生活費, 住宅, 通信, 車, 税金',
    strTagItems: '固定費, カード'
  }
}

/**
 * Mutations
 * ActionsからStateを更新するときに呼ばれます
 */
const mutations = {
  /** 指定年月の家計簿データをセットします */
  setAbData (state, { yearMonth, list }) {
    state.abData[yearMonth] = list
  },

  /** データを追加します */
  addAbData (state, { item }) {
    const yearMonth = item.date.slice(0, 7)
    const list = state.abData[yearMonth]
    if (list) {
      list.push(item)
    }
  },

  /** 指定年月のデータを更新します */
  updateAbData (state, { yearMonth, item }) {
    const list = state.abData[yearMonth]
    if (list) {
      const index = list.findIndex(v => v.id === item.id)
      list.splice(index, 1, item)
    }
  },

  /** 指定年月&IDのデータを削除します */
  deleteAbData (state, { yearMonth, id }) {
    const list = state.abData[yearMonth]
    if (list) {
      const index = list.findIndex(v => v.id === id)
      list.splice(index, 1)
    }
  },

  /** 設定を保存します */
  saveSettings (state, { settings }) {
    state.settings = { ...settings }
    document.title = state.settings.appName

    localStorage.setItem('settings', JSON.stringify(settings))
  },

  /** 設定を読み込みます */
  loadSettings (state) {
    const settings = JSON.parse(localStorage.getItem('settings'))
    if (settings) {
      state.settings = Object.assign(state.settings, settings)
    }
    document.title = state.settings.appName
  }
}

/**
 * Actions
 * 画面から呼ばれ、Mutationをコミットします
 */
const actions = {
  /** 指定年月の家計簿データを取得します */
  fetchAbData ({ commit }, { yearMonth }) {
    // サンプルデータを初期値として入れる
    const list = [
      { id: 'a34109ed', date: `${yearMonth}-01`, title: '支出サンプル', category: '買い物', tags: 'タグ1', income: null, outgo: 2000, memo: 'メモ' },
      { id: '7c8fa764', date: `${yearMonth}-02`, title: '収入サンプル', category: '給料', tags:'タグ1,タグ2', income: 2000, outgo: null, memo: 'メモ' }
    ]
    commit('setAbData', { yearMonth, list })
  },

  /** データを追加します */
  addAbData ({ commit }, { item }) {
    commit('addAbData', { item })
  },

  /** データを更新します */
  updateAbData ({ commit }, { beforeYM, item }) {
    const yearMonth = item.date.slice(0, 7)
    if (yearMonth === beforeYM) {
      commit('updateAbData', { yearMonth, item })
      return
    }
    const id = item.id
    commit('deleteAbData', { yearMonth: beforeYM, id })
    commit('addAbData', { item })
  },

  /** データを削除します */
  deleteAbData ({ commit }, { item }) {
    const yearMonth = item.date.slice(0, 7)
    const id = item.id
    commit('deleteAbData', { yearMonth, id })
  },

  /** 設定を保存します */
  saveSettings ({ commit }, { settings }) {
    commit('saveSettings', { settings })
  },

  /** 設定を読み込みます */
  loadSettings ({ commit }) {
    commit('loadSettings')
  }
}

/** カンマ区切りの文字をトリミングして配列にします */
const createItems = v => v.split(',').map(v => v.trim()).filter(v => v.length !== 0)

/**
 * Getters
 * 画面から取得され、Stateを加工して渡します
 */
const getters = {
  /** 収入カテゴリ（配列） */
  incomeItems (state) {
    return createItems(state.settings.strIncomeItems)
  },
  /** 支出カテゴリ（配列） */
  outgoItems (state) {
    return createItems(state.settings.strOutgoItems)
  },
  /** タグ（配列） */
  tagItems (state) {
    return createItems(state.settings.strTagItems)
  }
}

const store = new Vuex.Store({
  state,
  mutations,
  actions,
  getters
})

export default store