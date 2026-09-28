"""
Cybersecurity Network & Host Intrusion Dataset Generator
Generates realistic, standardized security telemetry based on real-world intrusion patterns:
- Normal background business traffic (HTTP/S, DNS, internal DB)
- SSH / RDP Brute Force (T1110)
- Network Port Scans (T1046)
- Web Application Attacks (SQLi, Directory Traversal T1190)
- Suspicious Logins & Privileged Abuse (T1078, T1068)
- Data Exfiltration Spikes (T1048)
"""

import os
import numpy as np
import pandas as pd

def generate_cybersecurity_dataset(n_samples: int = 5000, random_state: int = 42) -> pd.DataFrame:
    np.random.seed(random_state)
    
    records = []
    
    # Distribution: 60% Normal, 10% Brute Force, 10% Port Scan, 8% Web Attack, 6% Suspicious Login, 3% Privilege Escalation, 3% Data Exfiltration
    n_normal = int(n_samples * 0.60)
    n_bf = int(n_samples * 0.10)
    n_scan = int(n_samples * 0.10)
    n_web = int(n_samples * 0.08)
    n_login = int(n_samples * 0.06)
    n_priv = int(n_samples * 0.03)
    n_exfil = n_samples - (n_normal + n_bf + n_scan + n_web + n_login + n_priv)
    
    # 1. Normal Traffic
    for _ in range(n_normal):
        records.append({
            "duration": float(np.random.exponential(scale=1.5)),
            "src_bytes": int(np.random.gamma(shape=2, scale=300)),
            "dst_bytes": int(np.random.gamma(shape=4, scale=1200)),
            "src_port": int(np.random.randint(49152, 65535)),
            "dst_port": int(np.random.choice([80, 443, 53, 8080, 3306, 5432], p=[0.25, 0.45, 0.15, 0.05, 0.05, 0.05])),
            "protocol_num": int(np.random.choice([1, 2], p=[0.85, 0.15])), # 1: TCP, 2: UDP
            "count_10s": int(np.random.poisson(lam=2)),
            "srv_count_10s": int(np.random.poisson(lam=2)),
            "failed_logins": 0,
            "is_privileged": 0,
            "outbound_bytes_rate": float(np.random.normal(loc=150, scale=40)),
            "label": "NORMAL",
            "attack_category": "NORMAL"
        })
        
    # 2. Brute Force (high failed logins, rapid bursts to auth ports)
    for _ in range(n_bf):
        records.append({
            "duration": float(np.random.uniform(0.1, 0.8)),
            "src_bytes": int(np.random.randint(60, 220)),
            "dst_bytes": int(np.random.randint(40, 150)),
            "src_port": int(np.random.randint(49152, 65535)),
            "dst_port": int(np.random.choice([22, 3389, 445], p=[0.60, 0.30, 0.10])),
            "protocol_num": 1, # TCP
            "count_10s": int(np.random.randint(15, 60)),
            "srv_count_10s": int(np.random.randint(15, 60)),
            "failed_logins": int(np.random.randint(5, 25)),
            "is_privileged": 0,
            "outbound_bytes_rate": float(np.random.uniform(80, 250)),
            "label": "MALICIOUS",
            "attack_category": "BRUTE_FORCE"
        })

    # 3. Port Scan (very short duration, scanning multiple destination ports, low payload)
    for _ in range(n_scan):
        records.append({
            "duration": float(np.random.uniform(0.01, 0.08)),
            "src_bytes": int(np.random.randint(40, 70)),
            "dst_bytes": 0,
            "src_port": int(np.random.randint(40000, 65000)),
            "dst_port": int(np.random.randint(1, 1024)),
            "protocol_num": int(np.random.choice([1, 2], p=[0.9, 0.1])),
            "count_10s": int(np.random.randint(30, 120)),
            "srv_count_10s": int(np.random.randint(1, 3)),
            "failed_logins": 0,
            "is_privileged": 0,
            "outbound_bytes_rate": float(np.random.uniform(500, 1200)),
            "label": "MALICIOUS",
            "attack_category": "PORT_SCAN"
        })

    # 4. Web Application Attack (SQLi, XSS, Path Traversal on ports 80/443, unusual payload size)
    for _ in range(n_web):
        records.append({
            "duration": float(np.random.uniform(0.2, 2.5)),
            "src_bytes": int(np.random.randint(1200, 6500)),
            "dst_bytes": int(np.random.randint(200, 900)),
            "src_port": int(np.random.randint(49152, 65535)),
            "dst_port": int(np.random.choice([80, 443, 8080], p=[0.45, 0.45, 0.10])),
            "protocol_num": 1,
            "count_10s": int(np.random.randint(8, 25)),
            "srv_count_10s": int(np.random.randint(8, 25)),
            "failed_logins": 0,
            "is_privileged": 0,
            "outbound_bytes_rate": float(np.random.uniform(600, 3000)),
            "label": "MALICIOUS",
            "attack_category": "WEB_ATTACK"
        })

    # 5. Suspicious Login (odd hours, unusual location, 1-2 failed logins before success)
    for _ in range(n_login):
        records.append({
            "duration": float(np.random.uniform(1.0, 5.0)),
            "src_bytes": int(np.random.randint(250, 800)),
            "dst_bytes": int(np.random.randint(400, 1500)),
            "src_port": int(np.random.randint(49152, 65535)),
            "dst_port": int(np.random.choice([22, 443, 3389], p=[0.4, 0.3, 0.3])),
            "protocol_num": 1,
            "count_10s": int(np.random.randint(2, 6)),
            "srv_count_10s": int(np.random.randint(2, 6)),
            "failed_logins": int(np.random.choice([1, 2, 3])),
            "is_privileged": int(np.random.choice([0, 1], p=[0.7, 0.3])),
            "outbound_bytes_rate": float(np.random.uniform(100, 350)),
            "label": "SUSPICIOUS",
            "attack_category": "SUSPICIOUS_LOGIN"
        })

    # 6. Privilege Escalation (low network volume, is_privileged=1, sudden auth switch)
    for _ in range(n_priv):
        records.append({
            "duration": float(np.random.uniform(0.5, 3.0)),
            "src_bytes": int(np.random.randint(150, 450)),
            "dst_bytes": int(np.random.randint(150, 500)),
            "src_port": int(np.random.randint(49152, 65535)),
            "dst_port": int(np.random.choice([22, 445])),
            "protocol_num": 1,
            "count_10s": int(np.random.randint(3, 8)),
            "srv_count_10s": int(np.random.randint(3, 8)),
            "failed_logins": int(np.random.choice([0, 1])),
            "is_privileged": 1,
            "outbound_bytes_rate": float(np.random.uniform(150, 400)),
            "label": "MALICIOUS",
            "attack_category": "PRIVILEGE_ESCALATION"
        })

    # 7. Data Exfiltration (massive src_bytes to external IP/port, high duration)
    for _ in range(n_exfil):
        records.append({
            "duration": float(np.random.uniform(10.0, 120.0)),
            "src_bytes": int(np.random.randint(500000, 15000000)),
            "dst_bytes": int(np.random.randint(1000, 8000)),
            "src_port": int(np.random.randint(49152, 65535)),
            "dst_port": int(np.random.choice([443, 8443, 53, 9001], p=[0.4, 0.3, 0.15, 0.15])),
            "protocol_num": int(np.random.choice([1, 2], p=[0.8, 0.2])),
            "count_10s": int(np.random.randint(1, 4)),
            "srv_count_10s": 1,
            "failed_logins": 0,
            "is_privileged": 0,
            "outbound_bytes_rate": float(np.random.uniform(50000, 500000)),
            "label": "MALICIOUS",
            "attack_category": "DATA_EXFILTRATION"
        })

    df = pd.DataFrame(records)
    # Shuffle dataframe
    df = df.sample(frac=1.0, random_state=random_state).reset_index(drop=True)
    return df

if __name__ == "__main__":
    os.makedirs("ml/data", exist_ok=True)
    df = generate_cybersecurity_dataset(5000)
    out_path = "ml/data/cybersecurity_traffic.csv"
    df.to_csv(out_path, index=False)
    print(f"Generated {len(df)} records saved to {out_path}")
    print("Class distribution:")
    print(df["label"].value_counts())
    print("\nAttack Category distribution:")
    print(df["attack_category"].value_counts())
