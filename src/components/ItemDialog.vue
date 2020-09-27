<template>
  <!-- 追加／編集ダイアログ -->
  <v-dialog
    v-model="show"
    scrollable
    persistent
    max-width="500px"
    eager
  >
    <v-card>
      <v-card-title>{{ titleText }}</v-card-title>
      <v-divider/>
      <v-card-text>
        <v-form ref="form" v-model="valid">
          <!-- 日付選択 -->
          <v-menu
            ref="menu"
            v-model="menu"
            :close-on-content-click="false"
            :return-value.sync="date"
            transition="scale-transition"
            offset-y
            max-width="290px"
            min-width="290px"
          >
            <template v-slot:activator="{ on }">
              <v-text-field
                v-model="date"
                prepend-icon="mdi-calendar"
                readonly
                v-on="on"
                hide-details
              />
            </template>
            <v-date-picker
              v-model="date"
              color="green"
              locale="ja-jp"
              :day-format="date => new Date(date).getDate()"
              no-title
              scrollable
            >
              <v-spacer/>
              <v-btn text color="grey" @click="menu = false">キャンセル</v-btn>
              <v-btn text color="primary" @click="$refs.menu.save(date)">選択</v-btn>
            </v-date-picker>
          </v-menu>
          <!-- タイトル -->
          <v-text-field
            label="タイトル"
            v-model.trim="title"
            :counter="20"
            :rules="titleRules"
          />
          <!-- 収支 -->
          <v-radio-group
            row
            v-model="inout"
            hide-details
            @change="onChangeInout"
          >
            <v-radio label="収入" value="income"/>
            <v-radio label="支出" value="outgo"/>
          </v-radio-group>
          <!-- カテゴリ -->
          <v-select
            label="カテゴリ"
            v-model="category"
            :items="categoryItems"
            hide-details
          />
          <!-- タグ -->
          <v-select
            label="タグ"
            v-model="tags"
            :items="tagItems"
            multiple
            chips
            :rules="[tagRule]"
          />
          <!-- 金額 -->
          <v-text-field
            label="金額"
            v-model.number="amount"
            prefix="￥"
            pattern="[0-9]*"
            :rules="amountRules"
          />
          <!-- メモ -->
          <v-text-field
            label="メモ"
            v-model="memo"
            :counter="50"
            :rules="[memoRule]"
          />
        </v-form>
      </v-card-text>
      <v-divider/>
      <v-card-actions>
        <v-spacer/>
        <v-btn
          color="grey darken-1"
          text
          :disabled="loading"
          @click="onClickClose"
        >
          キャンセル
        </v-btn>
        <v-btn
          color="blue darken-1"
          text
          :disabled="!valid"
          :loading="loading"
          @click="onClickAction"
        >
          {{ actionText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapActions, mapGetters, mapState } from 'vuex'

export default {
  name: 'ItemDialog',

  data () {
    return {
      /** ダイアログの表示状態 */
      show: false,
      /** 入力したデータが有効かどうか */
      valid: false,
      /** 日付選択メニューの表示状態 */
      menu: false,

      /** 操作タイプ 'add' or 'edit' */
      actionType: 'add',
      /** id */
      id: '',
      /** 日付 */
      date: '',
      /** タイトル */
      title: '',
      /** 収支 'income' or 'outgo' */
      inout: '',
      /** カテゴリ */
      category: '',
      /** タグ */
      tags: [],
      /** 金額 */
      amount: 0,
      /** メモ */
      memo: '',

      /** 選択可能カテゴリ一覧 */
      categoryItems: [],
      /** 編集前の年月（編集時に使う） */
      beforeYM: '',

      /** バリデーションルール */
      titleRules: [
        v => v.trim().length > 0 || 'タイトルは必須です',
        v => v.length <= 20 || '20文字以内で入力してください'
      ],
      tagRule: v => v.length <= 5 || 'タグは5種類以内で選択してください',
      amountRules: [
        v => v >= 0 || '金額は0以上で入力してください',
        v => Number.isInteger(Number(v)) || '整数で入力してください'
      ],
      memoRule: v => v.length <= 50 || 'メモは50文字以内で入力してください'
    }
  },

  computed: {
    ...mapGetters([
      /** 収支カテゴリ */
      'incomeItems',
      'outgoItems',
      /** タグ */
      'tagItems'
    ]),

    ...mapState({
      /** ローディング状態 */
      loading: state => state.loading.add || state.loading.update
    }),

    /** ダイアログのタイトル */
    titleText () {
      return this.actionType === 'add' ? 'データ追加' : 'データ編集'
    },
    /** ダイアログのアクション */
    actionText () {
      return this.actionType === 'add' ? '追加' : '更新'
    }
  },

  methods: {
    ...mapActions([
      /** データ追加 */
      'addAbData',
      /** データ更新 */
      'updateAbData'
    ]),

    /**
     * ダイアログを表示します。
     * このメソッドは親から呼び出されます。
     */
    open (actionType, item) {
      this.show = true
      this.actionType = actionType
      this.resetForm(item)

      if (actionType === 'edit') {
        this.beforeYM = item.date.slice(0, 7)
      }
    },
    /** キャンセルがクリックされたとき */
    onClickClose () {
      this.show = false
    },
    /** 追加／更新がクリックされたとき */
    async onClickAction () {
      const item = {
        date: this.date,
        title: this.title,
        category: this.category,
        tags: this.tags.join(','),
        memo: this.memo,
        income: null,
        outgo: null
      }
      item[this.inout] = this.amount || 0

      if (this.actionType === 'add') {
        await this.addAbData({ item })
      } else {
        item.id = this.id
        await this.updateAbData({ beforeYM: this.beforeYM, item })
      }

      this.show = false
    },
    /** 収支が切り替わったとき */
    onChangeInout () {
      if (this.inout === 'income') {
        this.categoryItems = this.incomeItems
      } else {
        this.categoryItems = this.outgoItems
      }
      this.category = this.categoryItems[0]
    },
    /** フォームの内容を初期化します */
    resetForm (item = {}) {
      const today = new Date()
      const year = today.getFullYear()
      const month = ('0' + (today.getMonth() + 1)).slice(-2)
      const date = ('0' + today.getDate()).slice(-2)

      this.id = item.id || ''
      this.date = item.date || `${year}-${month}-${date}`
      this.title = item.title || ''
      this.inout = item.income != null ? 'income' : 'outgo'

      if (this.inout === 'income') {
        this.categoryItems = this.incomeItems
        this.amount = item.income || 0
      } else {
        this.categoryItems = this.outgoItems
        this.amount = item.outgo || 0
      }

      this.category = item.category || this.categoryItems[0]
      this.tags = item.tags ? item.tags.split(',') : []
      this.memo = item.memo || ''

      this.$refs.form.resetValidation()
    }
  }
}
</script>