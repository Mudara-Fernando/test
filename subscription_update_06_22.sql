
ALTER TABLE `viwo_panel_new`.`subscription`
ADD COLUMN `order_id` VARCHAR(45) NULL DEFAULT NULL AFTER `zoho_admin`,
ADD UNIQUE INDEX `order_id_UNIQUE` (`order_id` ASC);