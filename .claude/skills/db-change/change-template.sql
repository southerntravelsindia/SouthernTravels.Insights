/* =============================================================================================
   Change:     <ticket> — <one-line summary>
   Object:     [dbo].[<ObjectName>]            Database: <southerntravelsweb_ND | STPL_CostSheet | STPL_EMS>
   Author:     <name>                          Date: <YYYY-MM-DD>
   Callers:    <app: file> … (from /db-change impact analysis)
   Strategy:   <additive | new object | coordinated deploy>
   Rollback:   <YYYYMMDD_ticket_object_rollback.sql>
   Run order:  UAT first → smoke test → production. Run as a human; never from an AI session.
   ============================================================================================= */
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

-- Guard: fail fast on the wrong database.
IF DB_NAME() NOT IN (N'<ProdDbName>', N'<UatDbName>')
BEGIN
    RAISERROR(N'Wrong database: %s', 16, 1, DB_NAME());
    SET NOEXEC ON;
END
GO

CREATE OR ALTER PROCEDURE [dbo].[<ObjectName>]
    @ExistingParam1   INT,
    @ExistingParam2   VARCHAR(50),
    @NewOptionalParam BIT = 0          -- new parameters go last, with a default, so existing callers keep working
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Idempotency / existence check for anything a user can submit twice.
        -- IF EXISTS (SELECT 1 FROM dbo.<Table> WITH (UPDLOCK, HOLDLOCK) WHERE <natural key>) BEGIN … RETURN; END

        -- <change>

        COMMIT TRANSACTION;

        -- Result set: keep existing column names and order; append new columns at the end.
        -- SELECT …;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

SET NOEXEC OFF;
GO
