# Airwise Startup Script
# Bu betik backend sunucusunu ve Expo uygulamasını bağımsız pencerelerde başlatır.

Write-Host "Airwise: Sistem Başlatılıyor..." -ForegroundColor Cyan

# Yardımcı Fonksiyon: node_modules kontrolü
function Check-Dependencies {
    param($folder)
    if (!(Test-Path "$folder\node_modules")) {
        Write-Host ">>> $folder klasöründe bağımlılıklar eksik. Yükleniyor..." -ForegroundColor Cyan
        Push-Location $folder
        npm install
        if ($folder -eq "backend") {
            Write-Host ">>> Prisma Client oluşturuluyor..." -ForegroundColor Yellow
            npx prisma generate
        }
        Pop-Location
    }
}

# 1. Veritabanı Kontrolü
Write-Host "`n1. Veritabanı (Docker) ayağa kaldırılıyor..." -ForegroundColor Yellow
cd backend
docker-compose up -d
cd ..

# 2. Bağımlılık Kontrolleri
Write-Host "`n2. Bağımlılıklar kontrol ediliyor..." -ForegroundColor Yellow
Check-Dependencies "backend"
Check-Dependencies "mobile"
Check-Dependencies "backend/admin"

# 3. Backend Sunucusu
Write-Host "`n3. Backend API Sunucusu başlatılıyor (Yeni Pencere)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# 4. Mobil Uygulama (Expo)
Write-Host "4. Mobil Uygulama (Expo) başlatılıyor (Yeni Pencere)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd mobile; npx expo start -c --tunnel"

# 5. Yönetim Paneli (Admin Dashboard)
Write-Host "5. Yönetim Paneli (Admin) başlatılıyor (Yeni Pencere)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend/admin; npm run dev"

Write-Host "`n>>> Tüm servisler yeni pencerelerde başlatıldı." -ForegroundColor White
Write-Host ">>> Logları açılan yeni pencerelerden takip edebilirsiniz." -ForegroundColor Cyan
Write-Host ">>> Çıkmak için bu pencereyi kapatabilirsiniz." -ForegroundColor Gray
