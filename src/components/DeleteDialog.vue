<template>
  <!-- 削除ダイアログ -->
  <v-dialog
    v-model="show"
    persistent
    max-width="290"
  >
    <v-card>
      <v-card-title/>
      <v-card-text class="black--text">
        「{{ item.title }}」を削除しますか？
      </v-card-text>
      <v-card-actions>
        <v-spacer/>
        <v-btn color="grey" text :disabled="loading" @click="onClickClose">キャンセル</v-btn>
        <v-btn color="red" text :loading="loading" @click="onClickDelete">削除</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  name: 'DeleteDialog',

  data () {
    return {
      /** ダイアログの表示状態 */
      show: false,
      /** ローディング状態 */
      loading: false,
      /** 受け取ったデータ */
      item: {}
    }
  },

  methods: {
    ...mapActions([
      /** データ削除 */
      'deleteAbData'
    ]),

    /**
     * ダイアログを表示します。
     * このメソッドは親から呼び出されます。
     */    
    open (item) {
      this.show = true
      this.item = item
    },
    /** キャンセルがクリックされたとき */
    onClickClose () {
      this.show = false
    },
    /** 削除がクリックされたとき */
    onClickDelete () {
      this.deleteAbData({ item: this.item })
      this.show = false
    }
  }
}
</script>