<template>
  <v-app>
    <!-- ツールバー -->
    <v-app-bar app color="green" dark>
      <!-- タイトル -->
      <v-toolbar-title>{{ appName }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <!-- テーブルアイコンのボタン -->
      <v-btn icon to="/">
        <v-icon>mdi-file-table-outline</v-icon>
      </v-btn>
      <!-- 歯車アイコンのボタン -->
      <v-btn icon to="/settings">
        <v-icon>mdi-cog</v-icon>
      </v-btn>
    </v-app-bar>
    <!-- メインコンテンツ -->
    <v-main>
      <v-container fluid>
        <!-- router-view の中身がパスによって切り替わる -->
        <router-view></router-view>
      </v-container>
    </v-main>
    <!-- スナックバー -->
    <v-snackbar v-model="snackbar" color="error">{{ errorMessage }}</v-snackbar>
  </v-app>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'App',

  data () {
    return {
      snackbar: false
    }
  },

  computed: mapState({
    appName: state => state.settings.appName,
    errorMessage: state => state.errorMessage
  }),

  watch: {
    errorMessage () {
      this.snackbar = true
    }
  },

  // Appインスタンス生成前に一度だけ実行されます
  beforeCreate () {
    this.$store.dispatch('loadSettings')
  }
}
</script>
