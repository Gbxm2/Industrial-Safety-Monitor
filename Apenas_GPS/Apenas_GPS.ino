#include <TinyGPSPlus.h>

// ===============================
// GPS
// ===============================

TinyGPSPlus gps;
HardwareSerial GPS_Serial(2);

// Pinos do GPS
#define GPS_RX 16  // ESP32 recebe do TX do GPS
#define GPS_TX 17  // ESP32 envia para o RX do GPS

// Intervalo entre atualizações no Serial
const unsigned long INTERVALO_GPS = 30000; // 30 segundos

unsigned long ultimaLeituraGPS = 0;

void setup() {

  Serial.begin(115200);

  // Inicia comunicação com o GPS
  GPS_Serial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

  Serial.println();
  Serial.println("================================");
  Serial.println("       ESP32 + GPS NEO-6M");
  Serial.println("================================");
  Serial.println("Aguardando sinal GPS...");
  Serial.println();
}

void loop() {

  // =================================
  // Lê continuamente os dados do GPS
  // =================================

  while (GPS_Serial.available() > 0) {

    char c = GPS_Serial.read();

    gps.encode(c);
  }

  // =================================
  // A cada 30 segundos mostra posição
  // =================================

  if (millis() - ultimaLeituraGPS >= INTERVALO_GPS) {

    ultimaLeituraGPS = millis();

    if (gps.location.isValid()) {

      Serial.println();
      Serial.println("========== LOCALIZACAO ==========");

      Serial.print("Latitude:  ");
      Serial.println(gps.location.lat(), 6);

      Serial.print("Longitude: ");
      Serial.println(gps.location.lng(), 6);

      Serial.print("Altitude:  ");
      Serial.print(gps.altitude.meters());
      Serial.println(" m");

      Serial.print("Satélites: ");
      Serial.println(gps.satellites.value());

      Serial.print("Precisão HDOP: ");
      Serial.println(gps.hdop.hdop());

      Serial.println();

      Serial.print("Google Maps: ");
      Serial.print("https://www.google.com/maps?q=");
      Serial.print(gps.location.lat(), 6);
      Serial.print(",");
      Serial.println(gps.location.lng(), 6);

      Serial.println("=================================");
      Serial.println();

    } else {

      Serial.println();
      Serial.println("========== GPS ==========");

      Serial.println("GPS ainda sem localização...");

      Serial.print("Satélites detectados: ");
      Serial.println(gps.satellites.value());

      Serial.println("==========================");
      Serial.println();
    }
  }
}