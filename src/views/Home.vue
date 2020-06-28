<template>
  <div>
    <v-card>
      <v-card-title>
        <!-- 月選択 -->
        <v-col cols="8">
          <v-menu 
            ref="menu"
            v-model="menu"
            :close-on-content-click="false"
            :return-value.sync="yearMonth"
            transition="scale-transition"
            offset-y
            max-width="290px"
            min-width="290px"
          >
            <template v-slot:activator="{ on }">
              <v-text-field
                v-model="yearMonth"
                prepend-icon="mdi-calendar"
                readonly
                v-on="on"
                hide-details
              />
            </template>
            <v-date-picker
              v-model="yearMonth"
              type="month"
              color="green"
              locale="ja-jp"
              no-title
              scrollable
            >
              <v-spacer/>
              <v-btn text color="grey" @click="menu = false">キャンセル</v-btn>
              <v-btn text color="primary" @click="onSelectMonth">選択</v-btn>
            </v-date-picker>
          </v-menu>
        </v-col>
        <v-spacer/>
        <!-- 追加ボタン -->
        <v-col class="text-right" cols="4">
          <v-btn dark color="green" @click="onClickAdd">
            <v-icon>mdi-plus</v-icon>
          </v-btn>
        </v-col>
        <!-- 検索フォーム -->
        <v-col cols="12">
          <v-text-field
            v-model="search"
            append-icon="mdi-magnify"
            label="Search"
            single-line
            hide-details
          />
        </v-col>
      </v-card-title>
      <!-- テーブル -->
      <v-data-table
        class="text-no-wrap"
        :headers="tableHeaders"
        :items="tableData"
        :search="search"
        :footer-props="footerProps"
        :loading="loading"
        :sort-by="'date'"
        :sort-desc="true"
        :items-per-page="30"
        mobile-breakpoint="0"
      >
        <!-- 日付列 -->
        <template v-slot:item.date="{ item }">
          {{ parseInt(item.date.slice(-2)) + '日' }}
        </template>
        <!-- タグ列 -->
        <template v-slot:item.tags="{ item }">
          <div v-if="item.tags">
            <v-chip
              class="mr-2"
              v-for="(tag, i) in item.tags.split(',')"
              :key="i"
            >
              {{ tag }}
            </v-chip>
          </div>
        </template>
        <!-- 収入列 -->
        <template v-slot:item.income="{ item }">
          {{ separate(item.income) }}
        </template>
        <!-- タグ列 -->
        <template v-slot:item.outgo="{ item }">
          {{ separate(item.outgo) }}
        </template>
        <!-- 操作列 -->
        <template v-slot:item.actions="{ item }">
          <v-icon class="mr-2" @click="onClickEdit(item)">mdi-pencil</v-icon>
          <v-icon @click="onClickDelete(item)">mdi-delete</v-icon>
        </template>
      </v-data-table>
    </v-card>
    <!-- 追加／編集ダイアログ -->
    <ItemDialog ref="itemDialog"/>
    <!-- 削除ダイアログ -->
    <DeleteDialog ref="deleteDialog"/>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex'

import ItemDialog from '../components/ItemDialog.vue'
import DeleteDialog from '../components/DeleteDialog.vue'

export default {
  name: 'Home',

  components: {
    ItemDialog,
    DeleteDialog
  },

  data () {
    const today = new Date()
    const year = today.getFullYear()
    const month = ('0' + (today.getMonth() + 1)).slice(-2)

    return {
      /** ローディング状態 */
      loading: false,
      /** 月選択メニューの状態 */
      menu: false,
      /** 検索文字 */
      search: '',
      /** 選択年月 */
      yearMonth: `${year}-${month}`,
      /** テーブルに表示させるデータ */
      tableData: []
    }
  },

  computed: {
    ...mapState({
      /** 家計簿データ */
      abData: state => state.abData
    }),

    /** テーブルのヘッダー設定 */
    tableHeaders () {
      return [
        { text: '日付', value: 'date', align: 'end' },
        { text: 'タイトル', value: 'title', sortable: false },
        { text: 'カテゴリ', value: 'category', sortable: false },
        { text: 'タグ', value: 'tags', sortable: false },
        { text: '収入', value: 'income', align: 'end' },
        { text: '支出', value: 'outgo', align: 'end' },
        { text: 'メモ', value: 'memo', sortable: false },
        { text: '操作', value: 'actions', sortable: false }
      ]
    },

    /** テーブルのフッター設定 */
    footerProps () {
      return { itemsPerPageText: '', itemsPerPageOptions: [] }
    }
  },

  methods: {
    ...mapActions([
      /** 家計簿データを取得 */
      'fetchAbData'
    ]),

    /** 表示させるデータを更新します */
    updateTable () {
      const yearMonth = this.yearMonth
      const list = this.abData[yearMonth]

      if (list) {
        this.tableData = list
      } else {
        this.fetchAbData({ yearMonth })
        this.tableData = this.abData[yearMonth]
      }
    },

    /**
     * 数字を3桁区切りにして返します。
     * 受け取った数が null のときは null を返します。
     */
    separate (num) {
      return num !== null ? num.toString().replace(/(\d)(?=(\d{3})+$)/g, '$1,') : null
    },
    /** 月選択ボタンがクリックされたとき */
    onSelectMonth () {
      this.$refs.menu.save(this.yearMonth)
      this.updateTable()
    },
    /** 追加ボタンがクリックされたとき */
    onClickAdd () {
      this.$refs.itemDialog.open('add')
    },
    /** 編集ボタンがクリックされたとき */
    onClickEdit (item) {
      this.$refs.itemDialog.open('edit', item)
    },
    /** 削除ボタンがクリックされたとき */
    onClickDelete (item) {
      this.$refs.deleteDialog.open(item)
    }
  },

  created () {
    this.updateTable()
  }
}
</script>
