import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

/** 
 * State
 * Vuexの状態
 */
const state = {
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