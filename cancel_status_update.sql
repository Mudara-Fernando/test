USE viwoinc_pnlnw;

ALTER TABLE `viwoinc_pnlnw`.`subscription_event`
ADD COLUMN `cron_date` DATE NULL AFTER `renew_type`;

UPDATE subscription_event set cron_date = '2015-09-10';

ALTER TABLE `viwoinc_pnlnw`.`subscription`
ADD COLUMN `cron_date` DATE NULL DEFAULT NULL AFTER `order_id`;


ALTER TABLE `viwoinc_pnlnw`.`subscription`
ADD COLUMN `entry_exist` TINYINT(1) NULL AFTER `cron_date`;

update subscription set cron_date = '2015-09-10' where cron_date is NULL;
