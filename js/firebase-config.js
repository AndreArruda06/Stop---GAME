// ========================================
// CONFIGURAÇÃO DO FIREBASE - STOP!
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";

import { getDatabase } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-database.js";

import {
    getAuth,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

// ========================================
// CONFIGURAÇÕES DO PROJETO
// ========================================

const firebaseConfig = {

    apiKey: "AIzaSyAW2v3JOIS_0Q2ctRNSdzvGPLkOXJV9J-8",

    authDomain: "stop-online-ed0f9.firebaseapp.com",

    databaseURL: "https://stop-online-ed0f9-default-rtdb.firebaseio.com",

    projectId: "stop-online-ed0f9",

    storageBucket: "stop-online-ed0f9.firebasestorage.app",

    messagingSenderId: "563131821734",

    appId: "1:563131821734:web:e0b6aa6906a3677f930e67"

};

// ========================================
// INICIALIZAÇÃO DOS SERVIÇOS
// ========================================

const app = initializeApp(firebaseConfig);

const database = getDatabase(app);

const auth = getAuth(app);

// ========================================
// AUTENTICAÇÃO ANÔNIMA
// ========================================

async function autenticarJogador() {

    await auth.authStateReady();

    if (auth.currentUser) {

        return auth.currentUser;

    }

    const credencial = await signInAnonymously(auth);

    return credencial.user;

}

// ========================================
// EXPORTAÇÃO DOS SERVIÇOS
// ========================================

export {

    app,

    database,

    auth,

    autenticarJogador

};