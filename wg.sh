#!/bin/bash
set -e

# Проверка прав (должен выполняться с sudo или root)
if [ "$(id -u)" -ne 0 ]; then
    echo "Ошибка: скрипт должен запускаться с правами root (используйте sudo)"
    exit 1
fi

# Проверка зависимостей
for cmd in curl wg; do
    if ! command -v $cmd &> /dev/null; then
        echo "Устанавливаем необходимые пакеты..."
        apt update && apt install -y wireguard curl
        break
    fi
done

# Получение публичного IP
SERVER_IP=$(curl -4 -s ifconfig.me || curl -6 -s ifconfig.me)

if [[ -z "$SERVER_IP" ]]; then
    read -p "Не удалось определить публичный IP. Введите его вручную: " SERVER_IP
    while [[ -z "$SERVER_IP" ]]; do
        read -p "IP не может быть пустым. Введите публичный IP сервера: " SERVER_IP
    done
fi

echo "Используемый публичный IP сервера: $SERVER_IP"

# Генерация ключей
umask 077
SERVER_PRIVKEY=$(wg genkey)
SERVER_PUBKEY=$(echo "$SERVER_PRIVKEY" | wg pubkey)
CLIENT_PRIVKEY=$(wg genkey)
CLIENT_PUBKEY=$(echo "$CLIENT_PRIVKEY" | wg pubkey)

# Создание директории
mkdir -p /etc/wireguard
chmod 700 /etc/wireguard

# Сохранение ключей
echo "$SERVER_PRIVKEY" > /etc/wireguard/server_private.key
echo "$SERVER_PUBKEY" > /etc/wireguard/server_public.key
echo "$CLIENT_PRIVKEY" > /etc/wireguard/client_private.key
echo "$CLIENT_PUBKEY" > /etc/wireguard/client_public.key

# Конфигурация сервера
cat > /etc/wireguard/wg0.conf <<EOL
[Interface]
PrivateKey = $SERVER_PRIVKEY
Address = 10.0.0.1/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
PublicKey = $CLIENT_PUBKEY
AllowedIPs = 10.0.0.2/32
EOL

# Конфигурация клиента
cat > wg-client.conf <<EOL
[Interface]
PrivateKey = $CLIENT_PRIVKEY
Address = 10.0.0.2/32
DNS = 8.8.8.8, 8.8.4.4

[Peer]
PublicKey = $SERVER_PUBKEY
Endpoint = $SERVER_IP:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
EOL

# Включение IP forwarding
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
echo "net.ipv6.conf.all.forwarding=1" >> /etc/sysctl.conf
sysctl -p

# Запуск сервера
systemctl enable --now wg-quick@wg0

# QR-код для мобильных клиентов (если установлен qrencode)
if command -v qrencode &> /dev/null; then
    qrencode -t ansiutf8 < wg-client.conf
fi

echo "=============================================="
echo "Настройка завершена успешно!"
echo "Серверный конфиг: /etc/wireguard/wg0.conf"
echo "Клиентский конфиг: $(pwd)/wg-client.conf"
echo "Для подключения:"
echo "1. Импортируйте файл wg-client.conf в клиент WireGuard"
echo "2. $SERVER_PRIVKEY"
echo "= $CLIENT_PUBKEY ="