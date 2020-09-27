<template>
  <div>
    <v-card>
      <v-card-title>
        <!-- 月選択 -->
        <v-col cols="8" sm="3">
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
        <!-- 収支総計 -->
        <v-col class="overflow-x-auto" cols="12" sm="8">
          <div class="summary">
            <div class="mr-4">
              <table class="text-right">
                <tr>
                  <td>収入：</td>
                  <td>{{ separate(sum.income) }}</td>
                </tr>
                <tr>
                  <td>支出：</td>
                  <td>{{ separate(sum.outgo) }}</td>
                </tr>
                <tr>
                  <td>収支差：</td>
                  <td>{{ separate(sum.income - sum.outgo) }}</td>
                </tr>
              </table>
            </div>
            <div v-for="category in sum.categories" :key="category[0]">
              <v-progress-circular
                class="mr-2"
                :rotate="-90"
                :size="60"
                :width="5"
                :value="category[1]"
                color="teal"
              >
                {{ category[0] }}
              </v-progress-circular>
              <div class="text-center mr-2">{{ separate(category[2]) }}</div>
            </div>
          </div>
        </v-col>
        <!-- 検索フォーム -->
        <v-col cols="12" sm="4">
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
      abData: state => state.abData,
      /** ローディング状態 */
      loading: state => state.loading.fetch,
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
    },

    /** 収支総計 */
    sum () {
      let income = 0
      let outgo = 0
      const categoryOutgo = {}
      const categories = []

      // 収支の合計とカテゴリ別の支出を計算
      for (const row of this.tableData) {
        if (row.income !== null) {
          income += row.income
        } else {
          outgo += row.outgo
          if (categoryOutgo[row.category]) {
            categoryOutgo[row.category] += row.outgo
          } else {
            categoryOutgo[row.category] = row.outgo
          }
        }
      }

      // カテゴリ別の支出を降順にソート
      const sorted = Object.entries(categoryOutgo).sort((a, b) => b[1] - a[1])
      for (const [category, value] of sorted) {
        const percent = parseInt((value / outgo) * 100)
        categories.push([category, percent, value])
      }

      return {
        income,
        outgo,
        categories
      }
    }
  },

  methods: {
    ...mapActions([
      /** 家計簿データを取得 */
      'fetchAbData'
    ]),

    /** 表示させるデータを更新します */
    async updateTable () {
      const yearMonth = this.yearMonth
      const list = this.abData[yearMonth]

      if (list) {
        this.tableData = list
      } else {
        await this.fetchAbData({ yearMonth })
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

<style>
.summary {
  display: flex;
  font-size: 0.8rem;
  white-space: nowrap;
  line-height: 1.2rem;
}
</style>