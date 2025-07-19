#!/bin/bash
set -e

# Проверяем, установлен ли curl
if ! command -v curl &> /dev/null; then
    echo "Ошибка: curl не установлен. Установите его с помощью 'sudo apt install curl'"
    exit 1
fi

# Автоматическое получение публичного IP-адреса
SERVER_IP=$(curl -s ifconfig.me)

# Если автоматическое получение не сработало, предлагаем ввести вручную
if [[ -z "$SERVER_IP" || "$SERVER_IP" == *"error"* ]]; then
    read -p "Не удалось автоматически определить публичный IP. Введите его вручную: " SERVER_IP
    while [[ -z "$SERVER_IP" ]]; do
        read -p "Публичный IP не может быть пустым. Повторите ввод: " SERVER_IP
    done
fi

echo "Обнаружен публичный IP сервера: $SERVER_IP"

# Установка WireGuard
sudo apt update
sudo apt install -y wireguard

# Генерация ключей для сервера
SERVER_PRIVKEY=$(wg genkey)
SERVER_PUBKEY=$(echo "$SERVER_PRIVKEY" | wg pubkey)
sudo mkdir -p /etc/wireguard
echo "$SERVER_PRIVKEY" | sudo tee /etc/wireguard/server_private.key >/dev/null
echo "$SERVER_PUBKEY" | sudo tee /etc/wireguard/server_public.key >/dev/null
sudo chmod 600 /etc/wireguard/*.key

# Генерация ключей для клиента
CLIENT_PRIVKEY=$(wg genkey)
CLIENT_PUBKEY=$(echo "$CLIENT_PRIVKEY" | wg pubkey)
CLIENT_IP="10.0.0.2"

# Конфиг сервера
sudo tee /etc/wireguard/wg0.conf >/dev/null <<EOL
[Interface]
PrivateKey = $SERVER_PRIVKEY
Address = 10.0.0.1/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
PublicKey = $CLIENT_PUBKEY
AllowedIPs = $CLIENT_IP/32
EOL

# Конфиг клиента
tee wg-client.conf >/dev/null <<EOL
[Interface]
PrivateKey = $CLIENT_PRIVKEY
Address = $CLIENT_IP/32
DNS = 8.8.8.8

[Peer]
PublicKey = $SERVER_PUBKEY
Endpoint = $SERVER_IP:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
EOL

# Включение IP forwarding
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

sudo wg-quick up wg0

echo "=============================================="
echo "Настройка завершена!"
echo "1. Серверный конфиг: /etc/wireguard/wg0.conf"
echo "2. Клиентский конфиг: $(pwd)/wg-client.conf"
echo "3. Для подключения импортируйте файл wg-client.conf в клиент WireGuard"
echo "=============================================="