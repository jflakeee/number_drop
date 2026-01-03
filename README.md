# Number Drop - 숫자병합 퍼즐 게임

캐주얼 퍼즐 게임으로, 같은 숫자 블록을 병합하여 더 큰 숫자를 만드는 게임입니다.

## 플랫폼 지원

| 플랫폼 | 기술 스택 | 상태 |
|--------|----------|------|
| **모바일 웹** | Phaser 3 + TypeScript | ✅ 완료 |
| **Android 앱** | Flutter + Flame | ✅ 완료 |
| **iOS 앱** | Flutter + Flame | ✅ 완료 |

## 프로젝트 구조

```
number_drop/
├── frontend/           # 모바일 웹 버전 (Phaser 3)
│   ├── src/
│   │   ├── game/       # 게임 로직
│   │   ├── ui/         # React UI
│   │   └── services/   # API 서비스
│   └── dist/           # 빌드 결과물
│
├── flutter_app/        # 모바일 앱 (Flutter)
│   ├── lib/
│   │   ├── game/       # Flame 게임 로직
│   │   ├── screens/    # UI 화면
│   │   └── services/   # 저장소 서비스
│   ├── android/        # Android 설정
│   ├── ios/            # iOS 설정
│   └── build/          # 빌드 결과물
│
├── backend/            # API 서버 (Node.js)
└── docker-compose.yml  # Docker 구성
```

---

## 🌐 모바일 웹 버전 (Phaser)

### 기술 스택
- **Phaser 3** - 게임 엔진
- **TypeScript** - 타입 안전성
- **React** - UI 컴포넌트
- **Vite** - 빌드 도구
- **Capacitor** - 네이티브 앱 래핑 (선택)

### 개발 서버 실행

```bash
cd frontend
npm install
npm run dev
```

### 프로덕션 빌드

```bash
cd frontend
npm run build
# 결과물: dist/
```

### 배포

```bash
# 정적 파일 배포 (Nginx, S3, Vercel 등)
cp -r frontend/dist/* /var/www/html/

# 또는 Docker
docker-compose up -d
```

### 장점
- ✅ 빠른 로딩 (~500KB)
- ✅ SEO 친화적
- ✅ 앱 설치 불필요

---

## 📱 모바일 앱 (Flutter)

### 기술 스택
- **Flutter 3.38+** - 크로스 플랫폼 프레임워크
- **Flame** - 게임 엔진
- **Provider** - 상태 관리
- **shared_preferences** - 로컬 저장소

### 개발 서버 실행

```bash
cd flutter_app

# 웹에서 테스트
flutter run -d chrome

# Android 에뮬레이터
flutter run -d android

# iOS 시뮬레이터 (macOS)
flutter run -d ios
```

### 프로덕션 빌드

```bash
cd flutter_app

# Android APK
flutter build apk --release
# 결과물: build/app/outputs/flutter-apk/app-release.apk

# Android App Bundle (Play Store용)
flutter build appbundle --release
# 결과물: build/app/outputs/bundle/release/app-release.aab

# iOS (macOS 필요)
flutter build ios --release
# Xcode에서 Archive 후 App Store Connect 업로드
```

### 장점
- ✅ 네이티브 성능
- ✅ 오프라인 지원
- ✅ 푸시 알림 가능
- ✅ 스토어 배포

---

## 🔧 백엔드 API

### 기술 스택
- **Node.js + Express** - API 서버
- **PostgreSQL** - 데이터베이스
- **Redis** - 캐시 및 리더보드

### 실행

```bash
# Docker로 전체 실행
docker-compose up -d

# 개별 실행
cd backend
npm install
npm run dev
```

### API 엔드포인트
- `GET /api/leaderboard/top` - 상위 점수
- `POST /api/leaderboard/submit` - 점수 제출
- `GET /api/user/:id` - 사용자 정보

---

## 🎮 게임 규칙

1. 화면 상단에서 숫자 블록이 생성됩니다
2. 원하는 열을 터치하여 블록을 떨어뜨립니다
3. 같은 숫자가 인접하면 병합되어 2배가 됩니다
4. 연쇄 병합으로 콤보 점수를 획득합니다
5. 블록이 최상단에 도달하면 게임 오버입니다

## 🛒 아이템

| 아이템 | 비용 | 효과 |
|--------|------|------|
| 💣 폭탄 | 100 코인 | 특정 블록 제거 |
| 🔀 셔플 | 100 코인 | 블록 위치 재배치 |
| 🎬 광고 | 무료 | +50 코인 획득 |

---

## 📋 배포 체크리스트

### 모바일 웹
- [ ] `frontend/` 빌드 (`npm run build`)
- [ ] 정적 파일 서버 배포
- [ ] SSL 인증서 설정
- [ ] 도메인 연결

### Android
- [ ] `flutter_app/` 빌드 (`flutter build appbundle`)
- [ ] 앱 서명 키 생성
- [ ] Google Play Console 등록
- [ ] 스토어 등록 정보 작성

### iOS
- [ ] `flutter_app/` 빌드 (`flutter build ios`)
- [ ] Apple Developer 계정 설정
- [ ] Xcode에서 Archive
- [ ] App Store Connect 업로드

---

## 라이선스

MIT License
