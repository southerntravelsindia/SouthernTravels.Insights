/* =============================================================================================
   Rollback for: <YYYYMMDD_ticket_object.sql>
   Object:       [dbo].[<ObjectName>]          Database: <name>
   Restores:     the definition captured on <YYYY-MM-DD> from <UAT | production> via sp_helptext
   ============================================================================================= */
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF DB_NAME() NOT IN (N'<ProdDbName>', N'<UatDbName>')
BEGIN
    RAISERROR(N'Wrong database: %s', 16, 1, DB_NAME());
    SET NOEXEC ON;
END
GO

-- Paste the exact previous definition here (CREATE OR ALTER …).
-- For a new object, the rollback is: DROP PROCEDURE IF EXISTS [dbo].[<ObjectName>];
-- For new columns: drop dependent defaults/indexes first, then ALTER TABLE … DROP COLUMN.

GO
SET NOEXEC OFF;
GO
