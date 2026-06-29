/**
 * SMART PARKING AI - Firmware micro:bit
 * Tulis/paste kode ini di makecode.microbit.org
 * Cara pakai: buka project baru di MakeCode -> klik "JavaScript" di kanan atas
 * (bukan Blocks) -> hapus kode default -> paste semua kode ini.
 *
 * PIN SETUP:
 *  - P0  : IR sensor GATE MASUK
 *  - P1  : Servo GATE MASUK
 *  - P2  : Servo GATE KELUAR
 *  - P8  : IR sensor GATE KELUAR
 *  - P13 : IR sensor SLOT PARKIR (deteksi mobil ada di slot)
 *
 * PENTING: micro:bit V1 hanya bisa pilih SATU mode Bluetooth:
 * BLE (untuk UART ke web) ATAU Radio (ke microbit lain), tidak bisa keduanya.
 * Project ini pakai BLE UART jadi pastikan tidak ada blok "radio" lain ditambahkan.
 */

let slotTerisi = false
let statusMasuk = false
let statusKeluar = false

// ====== KONFIGURASI SENSOR (sesuaikan jika logika sensor IR kamu LOW = ada objek) ======
function adaObjek(pin: DigitalPin): boolean {
    // Ubah jadi == 0 kalau sensor IR kamu aktif LOW
    return pins.digitalReadPin(pin) == 1
}

// ====== FUNGSI BUKA-TUTUP SERVO ======
function bukaGate(servoPin: AnalogPin) {
    pins.servoWritePin(servoPin, 90)
    basic.pause(2000)
    pins.servoWritePin(servoPin, 0)
}

// ====== KIRIM DATA KE WEBSITE VIA BLE UART ======
// Format pesan: EVENT:VALUE  (diakhiri newline otomatis oleh uart.WriteLine)
function kirimData(event: string, value: string) {
    bluetooth.uartWriteLine(event + ":" + value)
    serial.writeLine(event + ":" + value) // buat debug via USB juga
}

// ====== SAAT BLE TERKONEKSI / TERPUTUS ======
bluetooth.onBleConnected(function () {
    basic.showIcon(IconNames.Yes)
    // kirim status terkini begitu website connect
    kirimData("SLOT", slotTerisi ? "FULL" : "AVAILABLE")
})

bluetooth.onBleDisconnected(function () {
    basic.showIcon(IconNames.No)
})

// ====== SETUP AWAL ======
basic.showIcon(IconNames.Target)
bluetooth.startUartService()

// ====== LOOP UTAMA ======
basic.forever(function () {
    // --- Cek slot parkir ---
    let slotSekarang = adaObjek(DigitalPin.P13)
    if (slotSekarang != slotTerisi) {
        slotTerisi = slotSekarang
        kirimData("SLOT", slotTerisi ? "FULL" : "AVAILABLE")
    }

    // --- Cek mobil masuk ---
    let masukSekarang = adaObjek(DigitalPin.P0)
    if (masukSekarang && !statusMasuk && !slotTerisi) {
        statusMasuk = true
        kirimData("EVENT", "MASUK_TERDETEKSI")
        bukaGate(AnalogPin.P1)
        kirimData("EVENT", "GATE_MASUK_TUTUP")
    }
    if (!masukSekarang) {
        statusMasuk = false
    }

    // --- Cek mobil keluar ---
    let keluarSekarang = adaObjek(DigitalPin.P8)
    if (keluarSekarang && !statusKeluar && slotTerisi) {
        statusKeluar = true
        kirimData("EVENT", "KELUAR_TERDETEKSI")
        bukaGate(AnalogPin.P2)
        kirimData("EVENT", "GATE_KELUAR_TUTUP")
    }
    if (!keluarSekarang) {
        statusKeluar = false
    }

    basic.pause(150)
})
