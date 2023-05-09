ALTER TABLE `viwoinc_pnlnw`.`service`
ADD COLUMN `viwo_plan` VARCHAR(45) NULL AFTER `skuName`;


INSERT INTO `service` (code, plan, display, color, skuName, viwo_plan )   VALUES
('Google-Apps-Unlimited', 'ANNUAL', 1 , '33A661' , 'G Suite Business', 'ANNUAL_MONTHLY'),
('Google-Apps-For-Business', 'ANNUAL',1 , '3C57FD' , 'G Suite Basic' , 'ANNUAL_MONTHLY'),
('Google-Apps-For-Government', 'ANNUAL',1 ,'0256A', 'G Suite for Government', 'ANNUAL_MONTHLY'),
('Google-Apps-Unlimited', 'ANNUAL_YEARLY_PAY',1 ,'33A661' , 'G Suite Business', 'ANNUAL_MONTHLY'),
('Google-Apps-For-Business', 'ANNUAL_YEARLY_PAY',1 ,'3C57FD' , 'G Suite Basic', 'ANNUAL_MONTHLY'),
(1010020020, 'ANNUAL',1 , '', 'G Suite Enterprise', 'ANNUAL_MONTHLY');
