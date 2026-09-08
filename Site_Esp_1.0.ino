
#include <WiFi.h>
#include <WebServer.h>
#include <Update.h>

#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// ============================================================
// CONFIGURAÇÃO DO WI-FI
// ============================================================

const char* ssid = "Wi-fi";
const char* password = "Senha";

// ============================================================
// LOGIN DO PAINEL WEB
// ============================================================

const char* webUsername = "Gbxm";
const char* webPassword = "Gbxm#1853";

// ============================================================
// SENHA PARA ATUALIZAÇÃO DO FIRMWARE
// ============================================================

const char* updatePassword = "Gbxm#1853";

// ============================================================
// NOME DO ESP32
// ============================================================

const char* hostname = "ESP32-SENSORES";

// ============================================================
// SERVIDOR WEB
// ============================================================

WebServer server(80);

// ============================================================
// SW-420
// ============================================================

const int sensorPin = 5;

// ============================================================
// MPU6050
// ============================================================

Adafruit_MPU6050 mpu;

// ============================================================
// CONTROLE DA DETECÇÃO
// ============================================================

bool detectar = true;

// Limite de impacto
float limiteImpacto = 20.0;

// ============================================================
// VARIÁVEIS DOS SENSORES
// ============================================================

float aceleracaoTotal = 0.0;

bool vibracaoDetectada = false;
bool impactoDetectado = false;

// ============================================================
// LOG
// ============================================================

#define MAX_LOGS 50

String logs[MAX_LOGS];
int logCount = 0;

// ============================================================
// TEMPORIZAÇÃO
// ============================================================

unsigned long ultimaLeitura = 0;

const unsigned long intervaloLeitura = 150;

// ============================================================
// SEGURANÇA - BLOQUEIO DE TENTATIVAS
// ============================================================

#define MAX_TENTATIVAS 5
#define TEMPO_BLOQUEIO 300000UL   // 5 minutos

struct TentativaLogin {
  IPAddress ip;
  int tentativas;
  unsigned long bloqueadoAte;
  bool usado;
};

#define MAX_IPS_BLOQUEADOS 8

TentativaLogin tentativas[MAX_IPS_BLOQUEADOS];

// ============================================================
// HEADERS ACEITOS PELO SERVIDOR
// ============================================================

const char* headerKeys[] = {
  "X-OTA-Password"
};

const size_t headerKeysCount = 1;

// ============================================================
// FUNÇÃO PARA ADICIONAR LOG
// ============================================================

void adicionarLog(String mensagem) {

  Serial.println(mensagem);

  if (logCount >= MAX_LOGS) {

    for (int i = 0; i < MAX_LOGS - 1; i++) {
      logs[i] = logs[i + 1];
    }

    logCount = MAX_LOGS - 1;
  }

  logs[logCount] = mensagem;

  logCount++;
}

// ============================================================
// PROCURA IP NA LISTA DE TENTATIVAS
// ============================================================

int encontrarIP(IPAddress ip) {

  for (int i = 0; i < MAX_IPS_BLOQUEADOS; i++) {

    if (tentativas[i].usado &&
        tentativas[i].ip == ip) {

      return i;
    }
  }

  return -1;
}

// ============================================================
// CRIA REGISTRO PARA NOVO IP
// ============================================================

int criarRegistroIP(IPAddress ip) {

  // Procura posição livre
  for (int i = 0; i < MAX_IPS_BLOQUEADOS; i++) {

    if (!tentativas[i].usado) {

      tentativas[i].ip = ip;
      tentativas[i].tentativas = 0;
      tentativas[i].bloqueadoAte = 0;
      tentativas[i].usado = true;

      return i;
    }
  }

  // Se estiver cheio, reutiliza a primeira posição
  tentativas[0].ip = ip;
  tentativas[0].tentativas = 0;
  tentativas[0].bloqueadoAte = 0;
  tentativas[0].usado = true;

  return 0;
}

// ============================================================
// VERIFICA SE O IP ESTÁ BLOQUEADO
// ============================================================

bool ipBloqueado(IPAddress ip) {

  int indice = encontrarIP(ip);

  if (indice == -1) {
    return false;
  }

  if (tentativas[indice].bloqueadoAte == 0) {
    return false;
  }

  if (millis() >= tentativas[indice].bloqueadoAte) {

    tentativas[indice].tentativas = 0;
    tentativas[indice].bloqueadoAte = 0;

    adicionarLog(
      "BLOQUEIO EXPIRADO - IP: " + ip.toString()
    );

    return false;
  }

  return true;
}

// ============================================================
// REGISTRA TENTATIVA INCORRETA
// ============================================================

void registrarFalhaLogin(IPAddress ip) {

  int indice = encontrarIP(ip);

  if (indice == -1) {
    indice = criarRegistroIP(ip);
  }

  tentativas[indice].tentativas++;

  Serial.print("Tentativa de login incorreta. IP: ");
  Serial.print(ip);
  Serial.print(" | Tentativas: ");
  Serial.println(tentativas[indice].tentativas);

  if (tentativas[indice].tentativas >= MAX_TENTATIVAS) {

    tentativas[indice].bloqueadoAte =
      millis() + TEMPO_BLOQUEIO;

    adicionarLog(
      "IP BLOQUEADO POR 5 MIN: " + ip.toString()
    );
  }
}

// ============================================================
// LOGIN CORRETO
// ============================================================

void loginSucesso(IPAddress ip) {

  int indice = encontrarIP(ip);

  if (indice != -1) {

    tentativas[indice].tentativas = 0;
    tentativas[indice].bloqueadoAte = 0;
  }
}

// ============================================================
// AUTENTICAÇÃO DO PAINEL
// ============================================================

bool autenticar() {

  IPAddress ip = server.client().remoteIP();

  // Verifica bloqueio
  if (ipBloqueado(ip)) {

    server.send(
      429,
      "text/plain",
      "IP temporariamente bloqueado. Tente novamente em alguns minutos."
    );

    return false;
  }

  // Verifica usuário e senha
  if (!server.authenticate(
        webUsername,
        webPassword)) {

    registrarFalhaLogin(ip);

    server.requestAuthentication(
  BASIC_AUTH,
  "ESP32-SENSORES",
  "Login necessario"
);

    return false;
  }

  // Login correto
  loginSucesso(ip);

  return true;
}

// ============================================================
// HTML DO PAINEL
// ============================================================

String paginaHTML() {

  String html = R"rawliteral(

<!DOCTYPE html>

<html lang="pt-BR">

<head>

<meta charset="UTF-8">

<meta name="viewport"
      content="width=device-width, initial-scale=1.0">

<title>ESP32 - Monitor de Sensores</title>

<style>

body {

  margin: 0;

  font-family: Arial, sans-serif;

  background: #111827;

  color: white;

}

.container {

  max-width: 1000px;

  margin: auto;

  padding: 20px;

}

h1 {

  text-align: center;

}

.grid {

  display: grid;

  grid-template-columns:
  repeat(auto-fit, minmax(250px, 1fr));

  gap: 15px;

}

.card {

  background: #1f2937;

  border-radius: 12px;

  padding: 20px;

  box-shadow: 0 4px 10px rgba(0,0,0,0.3);

}

.card h2 {

  margin-top: 0;

}

.status {

  font-size: 22px;

  font-weight: bold;

}

.normal {

  color: #22c55e;

}

.alerta {

  color: #ef4444;

}

button {

  border: none;

  border-radius: 8px;

  padding: 12px 18px;

  margin: 5px;

  cursor: pointer;

  font-size: 16px;

}

button:hover {

  opacity: 0.85;

}

.iniciar {

  background: #22c55e;

  color: white;

}

.parar {

  background: #ef4444;

  color: white;

}

.statusBtn {

  background: #3b82f6;

  color: white;

}

.limpar {

  background: #6b7280;

  color: white;

}

input[type="file"] {

  margin: 10px 0;

  max-width: 100%;

}

.update {

  background: #374151;

  padding: 20px;

  border-radius: 12px;

  margin-top: 20px;

}

.progress {

  width: 100%;

  height: 25px;

  background: #111827;

  border-radius: 10px;

  overflow: hidden;

  margin-top: 10px;

}

.progressBar {

  height: 100%;

  width: 0%;

  background: #3b82f6;

  text-align: center;

  line-height: 25px;

}

.log {

  background: #000;

  color: #00ff66;

  font-family: monospace;

  height: 300px;

  overflow-y: auto;

  padding: 15px;

  border-radius: 8px;

  white-space: pre-wrap;

}

.info {

  color: #9ca3af;

}

.security {

  color: #22c55e;

  font-size: 14px;

}

</style>

</head>


<body>

<div class="container">

<h1>ESP32 - Monitor de Sensores</h1>


<div class="grid">


<!-- WI-FI -->

<div class="card">

<h2>Wi-Fi</h2>

<p>Status:</p>

<div id="wifi" class="status normal">

CONECTADO

</div>

<p>IP:</p>

<strong id="ip">--</strong>

<p class="security">

Painel protegido por autenticação

</p>

</div>


<!-- DETECÇÃO -->

<div class="card">

<h2>Detecção</h2>

<p>Status:</p>

<div id="deteccao" class="status">

--

</div>

<button class="iniciar"
        onclick="comando('INICIAR')">

INICIAR

</button>

<button class="parar"
        onclick="comando('PARAR')">

PARAR

</button>

<button class="statusBtn"
        onclick="comando('STATUS')">

STATUS

</button>

</div>


<!-- MPU -->

<div class="card">

<h2>MPU6050</h2>

<p>Aceleração total:</p>

<div class="status">

<span id="aceleracao">--</span>

m/s²

</div>

<p>Estado:</p>

<div id="impacto">

--

</div>

</div>


<!-- SW420 -->

<div class="card">

<h2>SW-420</h2>

<p>Estado:</p>

<div id="vibracao" class="status">

--

</div>

</div>


</div>


<!-- LOG -->

<div class="card" style="margin-top:20px;">

<h2>Log</h2>

<div id="log" class="log">

Carregando...

</div>

<button class="limpar"
        onclick="limparLog()">

LIMPAR LOG

</button>

</div>


<!-- ATUALIZAÇÃO -->

<div class="update">

<h2>Atualização do Firmware</h2>

<p class="info">

Selecione o arquivo .bin compilado pela Arduino IDE.

</p>

<p class="info">

A atualização exige a senha específica do firmware.

</p>

<input type="file"
       id="firmware"
       accept=".bin">

<br>

<button class="statusBtn"
        onclick="atualizarFirmware()">

ATUALIZAR ESP32

</button>

<div class="progress">

<div id="progressBar"
     class="progressBar">

0%

</div>

</div>

<p id="updateStatus"></p>

</div>


</div>


<script>


// ============================================================
// COMANDOS
// ============================================================

function comando(cmd) {

  fetch('/comando?cmd=' + encodeURIComponent(cmd))

    .then(response => {

      if (response.status === 401) {

        alert('Sessão de autenticação necessária.');

      }

      return response.text();

    })

    .then(data => {

      console.log(data);

      atualizar();

    })

    .catch(error => {

      console.error(error);

    });

}


// ============================================================
// ATUALIZAÇÃO DAS INFORMAÇÕES
// ============================================================

function atualizar() {

  fetch('/dados')

    .then(response => response.json())

    .then(data => {


      document.getElementById('ip')
        .innerText = data.ip;


      document.getElementById('deteccao')
        .innerText =
        data.detectar ? 'ATIVA' : 'PARADA';


      document.getElementById('deteccao')
        .className =
        data.detectar
        ? 'status normal'
        : 'status alerta';


      document.getElementById('aceleracao')
        .innerText =
        data.aceleracao.toFixed(2);


      if (data.impacto) {

        document.getElementById('impacto')
          .innerText =
          'IMPACTO DETECTADO';

        document.getElementById('impacto')
          .className = 'alerta';

      }

      else {

        document.getElementById('impacto')
          .innerText = 'NORMAL';

        document.getElementById('impacto')
          .className = 'normal';

      }


      if (data.vibracao) {

        document.getElementById('vibracao')
          .innerText =
          'VIBRAÇÃO DETECTADA';

        document.getElementById('vibracao')
          .className = 'status alerta';

      }

      else {

        document.getElementById('vibracao')
          .innerText = 'NORMAL';

        document.getElementById('vibracao')
          .className = 'status normal';

      }


      document.getElementById('log')
        .innerText = data.log;


      // Mantém o log sempre na parte inferior

      const log = document.getElementById('log');

      log.scrollTop = log.scrollHeight;

    })

    .catch(error => {

      console.error(error);

    });

}


// ============================================================
// LIMPAR LOG
// ============================================================

function limparLog() {

  fetch('/limparlog')

    .then(() => {

      atualizar();

    });

}


// ============================================================
// ATUALIZAÇÃO DO FIRMWARE
// ============================================================

function atualizarFirmware() {


  const arquivo =
    document.getElementById('firmware')
    .files[0];


  if (!arquivo) {

    alert('Selecione um arquivo .bin');

    return;

  }


  const senha =
    prompt('Digite a senha de atualização do firmware:');


  if (senha === null) {

    return;

  }


  if (senha.length === 0) {

    alert('Senha não pode estar vazia.');

    return;

  }


  const xhr =
    new XMLHttpRequest();


  xhr.open(
    'POST',
    '/update',
    true
  );


  // ==========================================================
  // ENVIA A SENHA DO OTA EM HEADER HTTP
  // ==========================================================

  xhr.setRequestHeader(
    'X-OTA-Password',
    senha
  );


  xhr.upload.onprogress =
    function(event) {

      if (event.lengthComputable) {

        const porcentagem =
          Math.round(
            (event.loaded /
            event.total) * 100
          );


        const barra =
          document.getElementById(
            'progressBar'
          );


        barra.style.width =
          porcentagem + '%';


        barra.innerText =
          porcentagem + '%';

      }

    };


  xhr.onload =
    function() {

      if (xhr.status === 200) {

        document.getElementById(
          'updateStatus'
        ).innerText =
          'Atualização concluída. ESP32 reiniciando...';

      }

      else {

        document.getElementById(
          'updateStatus'
        ).innerText =
          'Erro na atualização: ' +
          xhr.responseText;

      }

    };


  xhr.onerror =
    function() {

      document.getElementById(
        'updateStatus'
      ).innerText =
        'Erro de comunicação com o ESP32.';

    };


  // Envia o arquivo diretamente

  xhr.send(arquivo);

}


// ============================================================
// ATUALIZA AUTOMATICAMENTE
// ============================================================

setInterval(
  atualizar,
  500
);


atualizar();


</script>


</body>

</html>

)rawliteral";


  return html;
}


// ============================================================
// PÁGINA PRINCIPAL
// ============================================================

void handleRoot() {

  if (!autenticar()) {
    return;
  }

  server.send(
    200,
    "text/html",
    paginaHTML()
  );
}


// ============================================================
// DADOS DOS SENSORES
// ============================================================

void handleDados() {

  if (!autenticar()) {
    return;
  }

  String json = "{";


  json += "\"ip\":\"";
  json += WiFi.localIP().toString();
  json += "\",";


  json += "\"detectar\":";
  json += detectar ? "true" : "false";
  json += ",";


  json += "\"aceleracao\":";
  json += String(aceleracaoTotal, 2);
  json += ",";


  json += "\"impacto\":";
  json += impactoDetectado ? "true" : "false";
  json += ",";


  json += "\"vibracao\":";
  json += vibracaoDetectada ? "true" : "false";
  json += ",";


  json += "\"log\":\"";


  for (int i = 0; i < logCount; i++) {

    String linha = logs[i];

    linha.replace("\\", "\\\\");
    linha.replace("\"", "\\\"");
    linha.replace("\n", "\\n");
    linha.replace("\r", "");

    json += linha;

    if (i < logCount - 1) {

      json += "\\n";

    }
  }


  json += "\"";

  json += "}";


  server.send(
    200,
    "application/json",
    json
  );
}


// ============================================================
// COMANDOS
// ============================================================

void handleComando() {

  if (!autenticar()) {
    return;
  }


  if (!server.hasArg("cmd")) {

    server.send(
      400,
      "text/plain",
      "Comando ausente"
    );

    return;
  }


  String comando =
    server.arg("cmd");


  comando.trim();
  comando.toUpperCase();


  if (comando == "INICIAR") {

    detectar = true;

    adicionarLog(
      "DETECCAO ATIVADA"
    );

    server.send(
      200,
      "text/plain",
      "DETECCAO ATIVADA"
    );
  }


  else if (comando == "PARAR") {

    detectar = false;

    vibracaoDetectada = false;
    impactoDetectado = false;

    adicionarLog(
      "DETECCAO DESATIVADA"
    );

    server.send(
      200,
      "text/plain",
      "DETECCAO DESATIVADA"
    );
  }


  else if (comando == "STATUS") {

    String resposta =
      detectar
      ? "DETECCAO ATIVA"
      : "DETECCAO PARADA";


    adicionarLog(
      "STATUS: " + resposta
    );


    server.send(
      200,
      "text/plain",
      resposta
    );
  }


  else {

    server.send(
      400,
      "text/plain",
      "Comando desconhecido"
    );
  }
}


// ============================================================
// LIMPAR LOG
// ============================================================

void handleLimparLog() {

  if (!autenticar()) {
    return;
  }


  logCount = 0;

  adicionarLog(
    "LOG LIMPO"
  );


  server.send(
    200,
    "text/plain",
    "OK"
  );
}


// ============================================================
// ATUALIZAÇÃO DO FIRMWARE
// ============================================================

void handleUpdate() {

  // Primeiro verifica o login do painel

  if (!autenticar()) {
    Update.abort();
    return;
  }


  HTTPUpload& upload =
    server.upload();


  // ==========================================================
  // INÍCIO DO UPLOAD
  // ==========================================================

  if (upload.status ==
      UPLOAD_FILE_START) {


    Serial.println(
      "Iniciando atualizacao OTA..."
    );


    // ========================================================
    // VERIFICA SENHA DO OTA
    // ========================================================

    if (!server.hasHeader(
          "X-OTA-Password")) {

      Serial.println(
        "Senha OTA nao enviada!"
      );

      adicionarLog(
        "OTA BLOQUEADO: senha nao enviada"
      );

      Update.abort();

      return;
    }


    String senhaOTA =
      server.header(
        "X-OTA-Password"
      );


    if (senhaOTA != updatePassword) {

      Serial.println(
        "Senha OTA incorreta!"
      );

      adicionarLog(
        "OTA BLOQUEADO: senha incorreta"
      );

      Update.abort();

      return;
    }


    adicionarLog(
      "OTA: senha correta"
    );


    // ========================================================
    // INICIA UPDATE
    // ========================================================

    if (!Update.begin(
          UPDATE_SIZE_UNKNOWN)) {

      Serial.println(
        "Falha ao iniciar OTA!"
      );

      Update.printError(
        Serial
      );

      adicionarLog(
        "OTA: falha ao iniciar"
      );

      return;
    }


    adicionarLog(
      "OTA: recebendo firmware..."
    );
  }


  // ==========================================================
  // RECEBIMENTO DOS DADOS
  // ==========================================================

  else if (
    upload.status ==
    UPLOAD_FILE_WRITE) {


    if (Update.write(
          upload.buf,
          upload.currentSize)
        != upload.currentSize) {


      Update.printError(
        Serial
      );


      adicionarLog(
        "OTA: erro ao gravar firmware"
      );
    }
  }


  // ==========================================================
  // FINAL DO UPLOAD
  // ==========================================================

  else if (
    upload.status ==
    UPLOAD_FILE_END) {


    if (Update.end(true)) {

      Serial.printf(
        "Atualizacao concluida: %u bytes\n",
        upload.totalSize
      );


      adicionarLog(
        "OTA CONCLUIDO: " +
        String(upload.totalSize) +
        " bytes"
      );
    }


    else {

      Update.printError(
        Serial
      );


      adicionarLog(
        "OTA: falha ao finalizar"
      );
    }
  }


  // ==========================================================
  // UPLOAD CANCELADO
  // ==========================================================

  else if (
    upload.status ==
    UPLOAD_FILE_ABORTED) {


    Update.abort();


    Serial.println(
      "Atualizacao cancelada."
    );


    adicionarLog(
      "OTA CANCELADO"
    );
  }
}


// ============================================================
// FINALIZAÇÃO DA ATUALIZAÇÃO
// ============================================================

void handleUpdateResult() {

  if (!autenticar()) {
    return;
  }


  if (Update.hasError()) {

    server.send(
      500,
      "text/plain",
      "Falha na atualizacao."
    );


    adicionarLog(
      "OTA: FALHA"
    );
  }


  else {

    server.send(
      200,
      "text/plain",
      "Atualizacao concluida. Reiniciando..."
    );


    adicionarLog(
      "ESP32 reiniciando apos OTA"
    );


    delay(1000);

    ESP.restart();
  }
}


// ============================================================
// SETUP
// ============================================================

void setup() {

  Serial.begin(115200);


  // ==========================================================
  // INICIALIZA SEGURANÇA
  // ==========================================================

  for (int i = 0; i < MAX_IPS_BLOQUEADOS; i++) {

    tentativas[i].usado = false;
    tentativas[i].tentativas = 0;
    tentativas[i].bloqueadoAte = 0;
  }


  // ==========================================================
  // SW-420
  // ==========================================================

  pinMode(
    sensorPin,
    INPUT
  );


  // ==========================================================
  // I2C
  // ==========================================================

  Wire.begin(
    18,
    19
  );


  // ==========================================================
  // MPU6050
  // ==========================================================

  if (!mpu.begin()) {

    Serial.println(
      "MPU6050 nao encontrado!"
    );

    while (1) {

      delay(10);
    }
  }


  Serial.println(
    "MPU6050 iniciado"
  );


  Serial.println(
    "SW-420 iniciado"
  );


  // ==========================================================
  // CONFIGURAÇÃO MPU6050
  // ==========================================================

  mpu.setAccelerometerRange(
    MPU6050_RANGE_8_G
  );


  mpu.setGyroRange(
    MPU6050_RANGE_500_DEG
  );


  mpu.setFilterBandwidth(
    MPU6050_BAND_21_HZ
  );


  // ==========================================================
  // WI-FI
  // ==========================================================

  WiFi.mode(
    WIFI_STA
  );


  WiFi.setHostname(
    hostname
  );


  WiFi.begin(
    ssid,
    password
  );


  Serial.print(
    "Conectando ao Wi-Fi"
  );


  while (
    WiFi.status() !=
    WL_CONNECTED) {

    delay(500);

    Serial.print(".");
  }


  Serial.println();

  Serial.println(
    "Wi-Fi conectado!"
  );


  Serial.print(
    "IP: "
  );

  Serial.println(
    WiFi.localIP()
  );


  // ==========================================================
  // CONFIGURA HEADERS
  // ==========================================================

  server.collectHeaders(
    headerKeys,
    headerKeysCount
  );


  // ==========================================================
  // ROTAS WEB
  // ==========================================================

  server.on(
    "/",
    HTTP_GET,
    handleRoot
  );


  server.on(
    "/dados",
    HTTP_GET,
    handleDados
  );


  server.on(
    "/comando",
    HTTP_GET,
    handleComando
  );


  server.on(
    "/limparlog",
    HTTP_GET,
    handleLimparLog
  );


  server.on(
    "/update",
    HTTP_POST,
    handleUpdateResult,
    handleUpdate
  );


  // ==========================================================
  // INICIA SERVIDOR
  // ==========================================================

  server.begin();


  Serial.println(
    "Servidor web iniciado!"
  );


  Serial.println(
    "===================================="
  );

  Serial.println(
    "PAINEL PROTEGIDO"
  );

  Serial.print(
    "Usuario: "
  );

  Serial.println(
    webUsername
  );

  Serial.println(
    "Senha do painel configurada."
  );

  Serial.println(
    "Senha OTA configurada separadamente."
  );

  Serial.println(
    "===================================="
  );


  Serial.println(
    "Acesse o IP acima pelo navegador."
  );


  adicionarLog(
    "SISTEMA INICIADO"
  );
}


// ============================================================
// LOOP
// ============================================================

void loop() {


  // ==========================================================
  // PROCESSA REQUISIÇÕES WEB
  // ==========================================================

  server.handleClient();


  // ==========================================================
  // LEITURA DOS SENSORES
  // ==========================================================

  if (
    detectar &&
    millis() - ultimaLeitura >=
    intervaloLeitura) {


    ultimaLeitura =
      millis();


    // ========================================================
    // SW-420
    // ========================================================

    int estado =
      digitalRead(
        sensorPin
      );


    vibracaoDetectada =
      (estado == HIGH);


    if (vibracaoDetectada) {

      adicionarLog(
        "SW-420: VIBRACAO DETECTADA!"
      );
    }


    // ========================================================
    // MPU6050
    // ========================================================

    sensors_event_t a;
    sensors_event_t g;
    sensors_event_t temp;


    mpu.getEvent(
      &a,
      &g,
      &temp
    );


    aceleracaoTotal =
      sqrt(

        (a.acceleration.x *
         a.acceleration.x)

        +

        (a.acceleration.y *
         a.acceleration.y)

        +

        (a.acceleration.z *
         a.acceleration.z)

      );


    impactoDetectado =
      aceleracaoTotal >
      limiteImpacto;


    if (impactoDetectado) {

      adicionarLog(

        "MPU6050: IMPACTO DETECTADO! Valor = "
        +
        String(
          aceleracaoTotal,
          2
        )

      );
    }
  }
}

