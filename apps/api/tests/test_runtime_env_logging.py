from runtime_env_logging import build_runtime_environment_summary


def test_build_runtime_environment_summary_redacts_sensitive_values() -> None:
    summary = build_runtime_environment_summary(
        {
            "DATABASE_URL": (
                "postgresql://postgres:super-secret@interchange.proxy.rlwy.net:28579/railway"
            ),
            "FRONTEND_URL": "http://localhost:6769",
            "SECRET_KEY": "very-secret-key",
            "SQL_ECHO": "true",
            "GEMINI_API_KEY": "AIzaSyBLjd_PsGylgnTBrnDSFGFAIqh5xZWWNYI",
        }
    )

    assert summary["database"]["driver"] == "postgresql"
    assert summary["database"]["host"] == "interchange.proxy.rlwy.net"
    assert summary["database"]["port"] == 28579
    assert summary["database"]["database"] == "railway"
    assert summary["database"]["username"] == "postgres"
    assert summary["database"]["password_set"] is True
    assert "super-secret" not in str(summary)
    assert summary["frontend_url"] == ["http://localhost:6769"]
    assert summary["secret_key_set"] is True
    assert summary["sql_echo"] is True
    assert summary["gemini_api_key_set"] is True


def test_build_runtime_environment_summary_handles_missing_values() -> None:
    summary = build_runtime_environment_summary({})

    assert summary["database"]["configured"] is False
    assert summary["frontend_url"] == []
    assert summary["secret_key_set"] is False
    assert summary["sql_echo"] is False
    assert summary["gemini_api_key_set"] is False
