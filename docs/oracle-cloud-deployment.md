# Oracle Cloud Free Tier 배포 가이드

Number Drop 리더보드 시스템을 Oracle Cloud Free Tier에 배포하는 방법을 설명합니다.

## 목차

1. [Oracle Cloud Free Tier 개요](#1-oracle-cloud-free-tier-개요)
2. [계정 생성](#2-계정-생성)
3. [VM 인스턴스 생성](#3-vm-인스턴스-생성)
4. [서버 초기 설정](#4-서버-초기-설정)
5. [Docker 설치](#5-docker-설치)
6. [애플리케이션 배포](#6-애플리케이션-배포)
7. [도메인 및 SSL 설정](#7-도메인-및-ssl-설정)
8. [모니터링 및 유지보수](#8-모니터링-및-유지보수)

---

## 1. Oracle Cloud Free Tier 개요

### Always Free 리소스

| 리소스 | 사양 |
|--------|------|
| **ARM Compute (Ampere A1)** | 4 OCPU + 24GB RAM (총합) |
| **AMD Compute** | 1/8 OCPU + 1GB RAM x 2개 |
| **Block Storage** | 200GB SSD |
| **Object Storage** | 20GB |
| **Outbound Traffic** | 10TB/월 |
| **Public IP** | 고정 1개 + 동적 2개 |
| **Autonomous Database** | 2개 (각 20GB) |
| **Load Balancer** | 1개 (10Mbps) |

### 권장 구성 (Number Drop)

```
ARM VM 1개
├── 4 OCPU (ARM64)
├── 24GB RAM
├── 100GB Boot Volume
├── Ubuntu 22.04 (aarch64)
└── Public IP (고정)
```

---

## 2. 계정 생성

### 2.1 가입 절차

1. [oracle.com/cloud/free](https://www.oracle.com/cloud/free/) 접속
2. **Start for free** 클릭
3. 이메일 인증 완료
4. 개인정보 입력
   - Country: South Korea
   - **Home Region: South Korea (Chuncheon)** ← 중요!
5. 신용카드 등록 (검증용, 과금 없음)
6. 계정 활성화 완료

### 2.2 홈 리전 선택 주의사항

- **홈 리전은 변경 불가** - 신중히 선택
- Always Free 리소스는 홈 리전에서만 사용 가능
- 한국 사용자 대상: **South Korea (Chuncheon)** 권장

---

## 3. VM 인스턴스 생성

### 3.1 인스턴스 생성

1. OCI Console 로그인
2. **Compute > Instances > Create Instance**
3. 설정:

```yaml
Name: number-drop-server
Compartment: (기본값)

Placement:
  Availability Domain: AD-1

Image and Shape:
  Image: Canonical Ubuntu 22.04 (aarch64)
  Shape: VM.Standard.A1.Flex
    OCPU: 4
    Memory: 24 GB

Networking:
  VCN: (새로 생성 또는 기존 선택)
  Subnet: Public Subnet
  Public IP: Assign a public IPv4 address

Boot Volume:
  Size: 100 GB

SSH Keys:
  Generate a key pair (다운로드 필수!)
  또는 기존 키 업로드
```

4. **Create** 클릭

### 3.2 ARM 인스턴스 품절 시 대처

인기 리전은 ARM 인스턴스가 품절될 수 있습니다.

**방법 1: 수동 재시도**
- 몇 시간 간격으로 재시도
- 새벽 시간대가 성공률 높음

**방법 2: 자동화 스크립트**
```bash
# OCI CLI 설치 후 사용
# instance-config.json 파일 필요

while true; do
  oci compute instance launch --from-json file://instance-config.json && break
  echo "Failed, retrying in 60 seconds..."
  sleep 60
done
```

### 3.3 방화벽 설정 (Security List)

**Networking > Virtual Cloud Networks > [VCN] > Security Lists**

Ingress Rules 추가:

| Source CIDR | Protocol | Port | 용도 |
|-------------|----------|------|------|
| 0.0.0.0/0 | TCP | 22 | SSH |
| 0.0.0.0/0 | TCP | 80 | HTTP |
| 0.0.0.0/0 | TCP | 443 | HTTPS |
| 0.0.0.0/0 | TCP | 3000 | Frontend (개발용) |
| 0.0.0.0/0 | TCP | 4000 | Backend API |

---

## 4. 서버 초기 설정

### 4.1 SSH 접속

```bash
# 다운로드한 키 파일 권한 설정
chmod 400 ssh-key-*.key

# 접속 (ubuntu 사용자)
ssh -i ssh-key-*.key ubuntu@<PUBLIC_IP>
```

### 4.2 시스템 업데이트

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget vim htop
```

### 4.3 방화벽 설정 (iptables)

Oracle Cloud는 OS 레벨 방화벽도 설정 필요:

```bash
# 포트 개방
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 4000 -j ACCEPT

# 저장
sudo netfilter-persistent save
```

### 4.4 스왑 메모리 설정 (선택)

```bash
# 4GB 스왑 생성
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구 적용
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 5. Docker 설치

### 5.1 Docker Engine 설치 (ARM64)

```bash
# 필수 패키지
sudo apt install -y ca-certificates curl gnupg lsb-release

# Docker GPG 키 추가
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 저장소 추가
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker 설치
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER
newgrp docker

# 설치 확인
docker --version
docker compose version
```

### 5.2 Docker Compose 설치 확인

```bash
# Docker Compose V2 (docker compose)
docker compose version

# 또는 standalone 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

---

## 6. 애플리케이션 배포

### 6.1 프로젝트 클론

```bash
cd ~
git clone <YOUR_REPOSITORY_URL> number_drop
cd number_drop
```

### 6.2 환경 변수 설정

```bash
# Backend 환경 변수
cat > backend/.env << 'EOF'
NODE_ENV=production
PORT=4000

# Database
DATABASE_URL=postgres://postgres:your_secure_password@db:5432/number_drop

# Redis
REDIS_URL=redis://redis:6379

# JWT (선택)
JWT_SECRET=your_jwt_secret_here
EOF

# Frontend 환경 변수
cat > frontend/.env << 'EOF'
VITE_API_URL=http://<YOUR_PUBLIC_IP>:4000
EOF
```

### 6.3 Docker Compose 파일 수정 (ARM64 호환)

`docker-compose.yml` 수정:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://${PUBLIC_IP}:4000
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://postgres:${DB_PASSWORD}@db:5432/number_drop
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    # ARM64 호환 이미지 자동 선택
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=number_drop
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    # ARM64 호환 이미지 자동 선택
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 6.4 배포 실행

```bash
# 환경 변수 설정
export PUBLIC_IP=$(curl -s ifconfig.me)
export DB_PASSWORD="your_secure_password_here"

# 빌드 및 실행
docker compose up -d --build

# 로그 확인
docker compose logs -f

# 상태 확인
docker compose ps
```

### 6.5 데이터베이스 초기화

```bash
# 마이그레이션 실행
docker compose exec backend npm run migrate

# 또는 수동 SQL 실행
docker compose exec db psql -U postgres -d number_drop -f /path/to/schema.sql
```

---

## 7. 도메인 및 SSL 설정

### 7.1 도메인 연결

1. 도메인 구매 (가비아, Cloudflare 등)
2. DNS A 레코드 설정:
   ```
   A    @       <PUBLIC_IP>
   A    api     <PUBLIC_IP>
   ```

### 7.2 Nginx 리버스 프록시 + SSL

```bash
# Nginx 설치
sudo apt install -y nginx

# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx
```

Nginx 설정 (`/etc/nginx/sites-available/number-drop`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 설정 활성화
sudo ln -s /etc/nginx/sites-available/number-drop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL 인증서 발급
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

---

## 8. 모니터링 및 유지보수

### 8.1 로그 확인

```bash
# Docker 로그
docker compose logs -f backend
docker compose logs -f frontend

# 시스템 로그
sudo journalctl -u docker -f
```

### 8.2 리소스 모니터링

```bash
# 실시간 모니터링
htop

# Docker 리소스 사용량
docker stats

# 디스크 사용량
df -h
```

### 8.3 자동 백업 스크립트

```bash
cat > ~/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# PostgreSQL 백업
docker compose exec -T db pg_dump -U postgres number_drop > $BACKUP_DIR/db_$DATE.sql

# Redis 백업
docker compose exec -T redis redis-cli BGSAVE

# 오래된 백업 삭제 (7일 이상)
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x ~/backup.sh

# Cron 등록 (매일 새벽 3시)
(crontab -l 2>/dev/null; echo "0 3 * * * ~/backup.sh >> ~/backup.log 2>&1") | crontab -
```

### 8.4 자동 재시작 설정

```bash
# Docker 서비스 자동 시작
sudo systemctl enable docker

# 컨테이너 자동 재시작 (docker-compose.yml에 restart: unless-stopped 설정됨)
```

### 8.5 90일 비활성 방지

Oracle Cloud는 90일간 미사용 시 인스턴스를 삭제할 수 있습니다.

```bash
# 간단한 활성 유지 스크립트 (cron)
cat > ~/keepalive.sh << 'EOF'
#!/bin/bash
curl -s http://localhost:4000/health > /dev/null
echo "Keepalive: $(date)"
EOF

chmod +x ~/keepalive.sh

# 매일 실행
(crontab -l 2>/dev/null; echo "0 12 * * * ~/keepalive.sh >> ~/keepalive.log 2>&1") | crontab -
```

---

## 트러블슈팅

### ARM 이미지 호환 문제

```bash
# 빌드 시 플랫폼 명시
docker build --platform linux/arm64 -t myapp .

# 또는 docker-compose.yml에 추가
services:
  backend:
    platform: linux/arm64
```

### 메모리 부족

```bash
# 스왑 증가
sudo swapoff /swapfile
sudo fallocate -l 8G /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 포트 접속 불가

1. Security List 확인 (OCI Console)
2. iptables 확인: `sudo iptables -L -n`
3. 서비스 상태 확인: `docker compose ps`

---

## 유용한 명령어 모음

```bash
# 전체 재시작
docker compose down && docker compose up -d

# 특정 서비스만 재시작
docker compose restart backend

# 로그 실시간 확인
docker compose logs -f --tail=100

# 컨테이너 접속
docker compose exec backend sh
docker compose exec db psql -U postgres -d number_drop

# 이미지 정리
docker system prune -a

# 디스크 사용량 확인
docker system df
```

---

## 참고 자료

- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [OCI Documentation](https://docs.oracle.com/en-us/iaas/Content/home.htm)
- [Docker on ARM64](https://docs.docker.com/desktop/multi-arch/)

---

*문서 작성일: 2026-01-02*
