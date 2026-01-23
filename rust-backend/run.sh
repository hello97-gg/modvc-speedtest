#!/bin/bash
# MODVC Speedtest - Rust Backend Runner
# 
# This script runs the ultra-fast Rust backend server

cd "$(dirname "$0")"
./target/release/speedtest_server
