package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"workflow/internal/auth"
	"workflow/internal/db"
	"workflow/internal/handlers"
	"workflow/internal/seed"
)

func main() {
	databaseURL := required("DATABASE_URL")
	secret := required("JWT_SECRET")
	port := env("PORT", "8080")
	origins := os.Getenv("FRONTEND_ORIGINS")
	if origins == "" {
		origins = env("https://submita-blush.vercel.app", "http://localhost:5173")
	}
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	store, err := db.OpenWithRetry(ctx, databaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer store.Pool.Close()
	if err := db.Migrate(databaseURL, "internal/db/migrations"); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	if err := seed.Run(ctx, store.Pool); err != nil {
		log.Fatalf("seed: %v", err)
	}
	h := handlers.New(store, auth.Manager{Secret: []byte(secret)})
	server := &http.Server{Addr: ":" + port, Handler: h.Router(origins), ReadHeaderTimeout: 5 * time.Second}
	go func() {
		<-ctx.Done()
		shutdownCtx, c := context.WithTimeout(context.Background(), 10*time.Second)
		defer c()
		_ = server.Shutdown(shutdownCtx)
	}()
	log.Printf("listening on :%s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
func required(key string) string {
	value := os.Getenv(key)
	if value == "" {
		log.Fatalf("%s is required", key)
	}
	return value
}
